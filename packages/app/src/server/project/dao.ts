import { eq } from "drizzle-orm"
import { Database, desc } from "../../storage/db"
import type { Project } from "./model"
import { ProjectTable } from "./sql"

class ProjectModel {
    async createProject(project: Project) {
        Database.use((db) => {
            db
                .insert(ProjectTable)
                .values({
                    id: project.id,
                    name: project.name,
                })
                .onConflictDoUpdate({
                    target: ProjectTable.id,
                    set: { name: project.name },
                })
                .run()
        })

        return project
    }

    async getProjectById(id: string): Promise<Project | undefined> {
        const row = Database.use((db) => db.select().from(ProjectTable).where(eq(ProjectTable.id, id)).get())
        if (!row) return undefined
        return {
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }
    }

    async *listProjects(query: { limit?: number; offset?: number }): AsyncIterable<Project> {
        const limit = query.limit ?? 100
        const offset = query.offset ?? 0

        const rows = Database.use((db) =>
            db
                .select()
                .from(ProjectTable)
                .orderBy(desc(ProjectTable.updated_at))
                .limit(limit)
                .offset(offset)
                .all(),
        )

        for (const row of rows) {
            yield {
                id: row.id,
                name: row.name,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }
        }
    }
}

export const projectModel = new ProjectModel()