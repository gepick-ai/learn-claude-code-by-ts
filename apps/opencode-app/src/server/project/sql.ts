import { sqliteTable, text, index } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../../storage/timestamps"

export const ProjectTable = sqliteTable("project", {
    id: text().primaryKey(),
    name: text().notNull(),
   ...Timestamps
})