import { integer } from "drizzle-orm/sqlite-core"

/** 供 schema（如 `server/session/sql.ts`）与 drizzle-kit 使用；勿在此文件 import `bun:sqlite`。 */
export const Timestamps = {
  created_at: integer()
    .notNull()
    .$default(() => Date.now()),
  updated_at: integer()
    .notNull()
    .$onUpdate(() => Date.now()),
}
