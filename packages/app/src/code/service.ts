import fs from "node:fs/promises"
import path from "node:path"
import { NotFoundError } from "../storage/error"
import { projectModel } from "../server/project/dao"
import { resolveInsideProjectRoot } from "./path-guard"
import { contentTypeForWorkspaceFile } from "./preview-mime"
import { ensureCodeWorkspace, resolveAbsoluteProjectDir } from "./workspace-root"

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

class CodeService {
  /**
   * 允许读取工作区：DB 中存在 project，或磁盘上已有 `.projects/{projectId}` 目录（例如仅拷贝了工作区、DB 未同步）。
   * 避免仅有目录却被 API 判为 404；仍校验 `projectId` 字符集与路径守卫。
   */
  async gateCodeWorkspaceRead(projectId: string): Promise<void> {
    const row = await projectModel.getProjectById(projectId)
    if (row) {
      await ensureCodeWorkspace(projectId)
      return
    }
    const absoluteProjectDir = resolveAbsoluteProjectDir(projectId)
    try {
      const st = await fs.stat(absoluteProjectDir)
      if (st.isDirectory()) {
        await ensureCodeWorkspace(projectId)
        return
      }
    } catch {
      /* ENOENT */
    }
    throw new NotFoundError({ message: "Project not found" })
  }

  /** 只读工作区文件（与 Agent fs_read 同一套路径解析与安全校验）。UTF-8 文本。 */
  async readWorkspaceTextFile(projectId: string, relPath: string): Promise<string> {
    /** 幂等补盘：DB 命中或磁盘已有目录时建好占位 */
    await this.gateCodeWorkspaceRead(projectId)
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
    await this.gateCodeWorkspaceRead(projectId)

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

export const codeService = new CodeService()
