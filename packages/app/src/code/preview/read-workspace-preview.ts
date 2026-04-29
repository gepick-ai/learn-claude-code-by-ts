import fs from "node:fs/promises"
import path from "node:path"
import { NotFoundError } from "../../storage/error"
import { resolveInsideProjectRoot } from "../path-guard"
import { contentTypeForWorkspaceFile } from "./preview-mime"
import { parsePathUnderPreview } from "./preview-path"

/**
 * Code v3 预览网关：只读返回工作区内文件（含目录下 `index.html` 默认入口）。
 * `pathAfterPreview` 为挂载在 `/project/:id/preview/` 之后的子路径（可有多个 `/` 段）。
 */
export async function readWorkspacePreviewFileFromDisk(
  absoluteProjectDir: string,
  pathAfterPreview: string,
): Promise<{ body: Buffer; contentType: string }> {
  let rel = parsePathUnderPreview(pathAfterPreview)
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
