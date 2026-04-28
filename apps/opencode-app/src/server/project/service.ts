import z from "zod"
import { Identifier } from "../../util/id"
import { projectModel } from "./dao"
import type { Project } from "./model"

export const ListProjectsInput = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
})

class ProjectService {
  async createProject() {
    const project: Project = {
      id: Identifier.descending("project"),
      name: "New Project",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await projectModel.createProject(project)

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