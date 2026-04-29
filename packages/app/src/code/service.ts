import fs from "node:fs/promises"
import { NotFoundError } from "../storage/error"
import { projectModel } from "../server/project/dao"
import { resolveInsideProjectRoot } from "./path-guard"
import { ensureCodeWorkspace, resolveAbsoluteProjectDir } from "./client-dev/workspace-root"
import { readWorkspacePreviewFileFromDisk } from "./preview/read-workspace-preview"

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
    const absoluteProjectDir = resolveAbsoluteProjectDir(projectId)
    return readWorkspacePreviewFileFromDisk(absoluteProjectDir, pathAfterPreview)
  }
}

export const codeService = new CodeService()
