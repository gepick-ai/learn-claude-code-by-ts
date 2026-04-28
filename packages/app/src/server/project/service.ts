import fs from "node:fs/promises"
import path from "node:path"
import z from "zod"
import { resolveInsideProjectRoot } from "../../agent/tools/project-path"
import { Identifier } from "../../util/id"
import { NotFoundError } from "../../storage/error"
import { projectModel } from "./dao"
import type { Project } from "./model"
import { contentTypeForWorkspaceFile } from "./preview-mime"
import { ensureProjectWorkspace, resolveAbsoluteProjectDir } from "./projects-root"

/** 预览 URL 中 `/preview/` 之后的部分（不含首尾 `/`），映射为工作区相对路径。 */
function parsePathUnderPreview(pathAfterPreview: string): string {
  const segments = pathAfterPreview.split("/").filter((s) => s.length > 0)
  const decoded: string[] = []
  for (const seg of segments) {
    let d: string
    try {
      d = decodeURIComponent(seg)
    } catch {
      throw new Error("Invalid URL encoding in preview path")
    }
    if (d === "..") {
      throw new Error("Path escapes project workspace: invalid segment")
    }
    if (d.includes("\0")) {
      throw new Error("Invalid path segment")
    }
    decoded.push(d)
  }
  return decoded.length === 0 ? "" : path.join(...decoded)
}

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
  /**
   * 允许读取工作区：DB 中存在 project，或磁盘上已有 `.projects/{projectId}` 目录（例如仅拷贝了工作区、DB 未同步）。
   * 避免仅有目录却被 API 判为 404；仍校验 `projectId` 字符集与路径守卫。
   */
  private async gateProjectWorkspaceRead(projectId: string): Promise<void> {
    const row = await projectModel.getProjectById(projectId)
    if (row) {
      await ensureProjectWorkspace(projectId)
      return
    }
    const absoluteProjectDir = resolveAbsoluteProjectDir(projectId)
    try {
      const st = await fs.stat(absoluteProjectDir)
      if (st.isDirectory()) {
        await ensureProjectWorkspace(projectId)
        return
      }
    } catch {
      /* ENOENT */
    }
    throw new NotFoundError({ message: "Project not found" })
  }

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
    /** 幂等补盘：DB 命中或磁盘已有目录时建好占位 */
    await this.gateProjectWorkspaceRead(projectId)
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

  /**
   * Code v3 预览网关：只读返回工作区内文件（含 `index.html` 默认入口）。
   * `pathAfterPreview` 为挂载在 `/project/:id/preview/` 之后的子路径（可有多个 `/` 段）。
   */
  async readWorkspacePreviewFile(
    projectId: string,
    pathAfterPreview: string,
  ): Promise<{ body: Buffer; contentType: string }> {
    await this.gateProjectWorkspaceRead(projectId)

    let rel = parsePathUnderPreview(pathAfterPreview)
    const absoluteProjectDir = resolveAbsoluteProjectDir(projectId)
    let absTarget = resolveInsideProjectRoot(absoluteProjectDir, rel)

    let st: Awaited<ReturnType<typeof fs.stat>>
    try {
      st = await fs.stat(absTarget)
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? (e as NodeJS.ErrnoException).code : undefined
      if (code === "ENOENT") {
        throw new NotFoundError({ message: "File not found" })
      }
      throw e
    }

    if (st.isDirectory()) {
      rel = path.join(rel, "index.html")
      absTarget = resolveInsideProjectRoot(absoluteProjectDir, rel)
      try {
        st = await fs.stat(absTarget)
      } catch (e) {
        const code = e && typeof e === "object" && "code" in e ? (e as NodeJS.ErrnoException).code : undefined
        if (code === "ENOENT") {
          throw new NotFoundError({ message: "File not found" })
        }
        throw e
      }
      if (!st.isFile()) {
        throw new NotFoundError({ message: "File not found" })
      }
    }

    const body = await fs.readFile(absTarget)
    const contentType = contentTypeForWorkspaceFile(absTarget)
    return { body, contentType }
  }
}

export const projectService = new ProjectService()