import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Database as BunDatabase } from "bun:sqlite"
import { drizzle, type SQLiteBunDatabase } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { type SQLiteTransaction } from "drizzle-orm/sqlite-core"
export * from "drizzle-orm"
import { Context } from "../util/context"
import { lazy } from "../util/lazy"
import { findMonorepoRoot } from "../util/monorepo-root"

/** `packages/app` 根目录 */
const moduleDir = path.dirname(fileURLToPath(import.meta.url))

function resolveAppRoot() {
  const candidates = [
    moduleDir,
    path.resolve(moduleDir, ".."),
    path.resolve(moduleDir, "../.."),
  ]
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "migration"))) {
      return dir
    }
  }
  return path.resolve(moduleDir, "../..")
}

const appRoot = resolveAppRoot()

function resolveDbDataLocation() {
  const rawPath = process.env.APP_DB_PATH?.trim()
  const root = findMonorepoRoot()
  if (!rawPath) return path.join(root, ".data")
  if (path.isAbsolute(rawPath)) return rawPath
  return path.resolve(root, rawPath)
}

const dbDataLocation = resolveDbDataLocation()

export const dbPath = path.join(dbDataLocation, "app.db")

/** 与 opencode 一致：`migration/<YYYYMMDDHHMMSS>_<slug>/{migration.sql,snapshot.json}` */
export const migrationDir = path.join(appRoot, "migration")

type Client = SQLiteBunDatabase

const state = {
  sqlite: undefined as BunDatabase | undefined,
}

export namespace Database {
  export type Transaction = SQLiteTransaction<"sync", void, any, any>

  export const Client = lazy(() => {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    fs.mkdirSync(migrationDir, { recursive: true })

    const sqlite = new BunDatabase(dbPath, { create: true })
    state.sqlite = sqlite

    sqlite.run("PRAGMA journal_mode = WAL")
    sqlite.run("PRAGMA synchronous = NORMAL")
    sqlite.run("PRAGMA busy_timeout = 5000")
    sqlite.run("PRAGMA cache_size = -64000")
    sqlite.run("PRAGMA foreign_keys = ON")
    sqlite.run("PRAGMA wal_checkpoint(PASSIVE)")

    return drizzle({ client: sqlite })
  })

  export function runMigrations() {
    const db = Client()
    migrate(db, { migrationsFolder: migrationDir })
  }

  export function close() {
    const sqlite = state.sqlite
    if (!sqlite) return
    sqlite.close()
    state.sqlite = undefined
    Client.reset()
  }

  export type TxOrDb = SQLiteTransaction<"sync", void, any, any> | Client

  const ctx = Context.create<{
    tx: TxOrDb
    effects: (() => void | Promise<void>)[]
  }>("database")

  export function use<T>(callback: (trx: TxOrDb) => T): T {
    try {
      return callback(ctx.use().tx)
    } catch (err) {
      if (err instanceof Context.NotFound) {
        const effects: (() => void | Promise<void>)[] = []
        const result = ctx.provide({ effects, tx: Client() }, () => callback(Client()))
        for (const effect of effects) effect()
        return result
      }
      throw err
    }
  }

  export function effect(fn: () => any | Promise<any>) {
    try {
      ctx.use().effects.push(fn)
    } catch {
      fn()
    }
  }

  export function transaction<T>(callback: (tx: TxOrDb) => T): T {
    try {
      return callback(ctx.use().tx)
    } catch (err) {
      if (err instanceof Context.NotFound) {
        const effects: (() => void | Promise<void>)[] = []
        const result = (Client().transaction as any)((tx: TxOrDb) => {
          return ctx.provide({ tx, effects }, () => callback(tx))
        })
        for (const effect of effects) effect()
        return result
      }
      throw err
    }
  }
}

export { Timestamps } from "./timestamps"