import fs from "node:fs/promises"
import z from "zod"
import { resolveInsideProjectRoot } from "../../agent/tools/project-path"
import { Identifier } from "../../util/id"
import { NotFoundError } from "../../storage/error"
import { projectModel } from "./dao"
import type { Project } from "./model"
import { ensureProjectWorkspace, resolveAbsoluteProjectDir } from "./projects-root"

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
      await ensureProjectWorkspace(id)
    } catch (err) {
      console.error("ensureProjectWorkspace failed", { projectId: id, err })
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

  /** 只读工作区文件（与 Agent fs_read 同一套路径解析与安全校验）。UTF-8 文本。 */
  async readWorkspaceTextFile(projectId: string, relPath: string): Promise<string> {
    const row = await projectModel.getProjectById(projectId)
    if (!row) {
      throw new NotFoundError({ message: "Project not found" })
    }
    /** 幂等补盘：仅有 DB、历史上未落盘的 project 也会在首次预览/读文件时建好 `.projects/{id}` */
    await ensureProjectWorkspace(projectId)
    const absoluteProjectDir = resolveAbsoluteProjectDir(projectId)
    const absFile = resolveInsideProjectRoot(absoluteProjectDir, relPath)
    try {
      return await fs.readFile(absFile, "utf8")
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? (e as NodeJS.ErrnoException).code : undefined
      if (code === "ENOENT") {
        throw new NotFoundError({ message: "File not found" })
      }
      throw e
    }
  }
}

export const projectService = new ProjectService()