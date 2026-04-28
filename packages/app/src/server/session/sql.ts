import { sqliteTable, text, index } from "drizzle-orm/sqlite-core"
import type { Message, Part } from "./model"
import { Timestamps } from "../../storage/timestamps"
import { ProjectTable } from "../project/sql"

export type MessageData = Omit<Message, "id" | "sessionId">
export type PartData = Omit<Part, "id" | "sessionId" | "messageId">

export const SessionTable = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull().references(() => ProjectTable.id, { onDelete: "cascade" }),
  title: text().notNull(),
  ...Timestamps,
})

export const MessageTable = sqliteTable("message",
  {
    id: text().primaryKey(),
    session_id: text().notNull().references(() => SessionTable.id, { onDelete: "cascade" }),
    data: text({ mode: "json" }).notNull().$type<MessageData>(),
    ...Timestamps,
  },
  (table) => [index("message_session_idx").on(table.session_id)],
)

export const PartTable = sqliteTable("part",
  {
    id: text().primaryKey(),
    session_id: text().notNull(),
    message_id: text().notNull().references(() => MessageTable.id, { onDelete: "cascade" }),
    data: text({ mode: "json" }).notNull().$type<PartData>(),
    ...Timestamps,
  },
  (table) => [index("part_message_idx").on(table.message_id), index("part_session_idx").on(table.session_id)],
)

