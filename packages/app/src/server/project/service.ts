import z from "zod"
import { Identifier } from "../../util/id"
import { ensureCodeWorkspace } from "../../code/client-dev/workspace-root"
import { projectModel } from "./dao"
import type { Project } from "./model"

export const ListProjectsInput = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
})

function toProjectDisplayName(projectId: string): string {
  const [prefixPart, suffixPart = ""] = projectId.split("_")
  const prefix = (prefixPart ?? "").trim() || "prj"
  const suffix = suffixPart.trim().slice(0, 6)
  return `${prefix}_${suffix}`
}

class ProjectService {
  async createProject() {
    const id = Identifier.descending("project")
    const project: Project = {
      id,
      name: toProjectDisplayName(id),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await projectModel.createProject(project)
    try {
      await ensureCodeWorkspace(id)
    } catch (err) {
      console.error("ensureCodeWorkspace failed", { projectId: id, err })
      throw err
    }

    return project
  }

  async listProjects(query: z.infer<typeof ListProjectsInput>): Promise<Project[]> {
    const projects = [] as Project[]

    for await (const p of projectModel.listProjects(query)) {
      projects.push(p)
    }

    return projects
  }
}

export const projectService = new ProjectService()