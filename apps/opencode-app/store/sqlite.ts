import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SessionMessages } from "../agent/types";
import type { SessionStore } from "./types";

/**
 * 使用本地 SQLite 文件持久化会话（依赖 Bun 内置 `bun:sqlite`）。
 * 默认库路径：`store/data/sessions.sqlite`（相对本文件目录）。
 */
export class SqliteSessionStore implements SessionStore {
  private readonly db: Database;

  constructor(filePath?: string) {
    const storeDir = dirname(fileURLToPath(import.meta.url));
    const resolved =
      filePath ??
      process.env.SQLITE_PATH ??
      join(storeDir, "data", "sessions.sqlite");
    mkdirSync(dirname(resolved), { recursive: true });
    this.db = new Database(resolved);
    this.initTable();
  }

  private initTable(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        messages TEXT NOT NULL DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  createSession(): string {
    const sessionId = crypto.randomUUID();
    this.db.run("INSERT INTO sessions (id, messages) VALUES (?, ?)", [
      sessionId,
      "[]",
    ]);
    return sessionId;
  }

  getSession(sessionId: string): SessionMessages | undefined {
    const row = this.db
      .query<{ messages: string }, [string]>(
        "SELECT messages FROM sessions WHERE id = ?"
      )
      .get(sessionId);
    if (!row) {
      return undefined;
    }
    return JSON.parse(row.messages) as SessionMessages;
  }

  saveSession(sessionId: string, messages: SessionMessages): void {
    const json = JSON.stringify(messages);
    this.db.run(
      "UPDATE sessions SET messages = ?, updated_at = datetime('now') WHERE id = ?",
      [json, sessionId]
    );
  }
}
