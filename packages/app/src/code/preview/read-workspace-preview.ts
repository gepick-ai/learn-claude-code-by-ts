import fs from "node:fs/promises"
import path from "node:path"
import { NotFoundError } from "../../storage/error"
import { resolveInsideProjectRoot } from "../path-guard"
import { contentTypeForWorkspaceFile } from "./preview-mime"
import { parsePathUnderPreview } from "./preview-path"

/** 兼容旧/非规范构建：预览子路径下将 `/assets/*`、`/vite.svg` 改为相对路径，避免命中站点根 404。 */
function rewriteHtmlForPreviewSubpath(rel: string, html: string): string {
  const normalized = rel.replace(/\\/g, "/")
  if (!normalized.endsWith("client/dist/index.html")) {
    return html
  }
  return html
    .replace(/(["'])\/assets\//g, "$1./assets/")
    .replace(/(["'])\/vite\.svg(["'])/g, "$1./vite.svg$2")
}

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

  let body = await fs.readFile(absTarget)
  const contentType = contentTypeForWorkspaceFile(absTarget)
  if (contentType.startsWith("text/html")) {
    const rewritten = rewriteHtmlForPreviewSubpath(rel, body.toString("utf8"))
    body = Buffer.from(rewritten, "utf8")
  }
  return { body, contentType }
}
