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

function isDistIndexPreviewEntry(rel: string): boolean {
  const normalized = rel.replace(/\\/g, "/")
  return normalized.endsWith("client/dist/index.html")
}

function isInvalidDistIndexHtml(html: string): { invalid: boolean; reason?: string } {
  const hitPreviewBuiltText =
    /Preview is not built yet/i.test(html) || /<title>\s*Preview Not Built\s*<\/title>/i.test(html)
  if (hitPreviewBuiltText) {
    return { invalid: true, reason: "检测到占位预览页，尚未生成真实构建产物。" }
  }
  if (
    /<script[^>]+src=["']\/src\//i.test(html) ||
    /<script[^>]+src=["']\.\/src\//i.test(html) ||
    /<script[^>]+src=["']src\//i.test(html)
  ) {
    return { invalid: true, reason: "检测到 dist 入口仍引用 src 源码路径，产物不是有效的生产构建结果。" }
  }
  return { invalid: false }
}

function buildInvalidPreviewHtml(reason: string): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>预览产物无效</title>
  </head>
  <body style="font-family: sans-serif; padding: 16px; line-height: 1.6;">
    <h3>预览产物无效</h3>
    <p>${reason}</p>
    <p>请在 <code>client/</code> 下重新执行：</p>
    <pre style="background:#f5f5f5;padding:8px;border-radius:6px;">npm install
npm run build</pre>
    <p>然后刷新预览。</p>
  </body>
</html>
`
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
    const html = body.toString("utf8")
    if (isDistIndexPreviewEntry(rel)) {
      const check = isInvalidDistIndexHtml(html)
      if (check.invalid) {
        const invalidHtml = buildInvalidPreviewHtml(check.reason ?? "dist 入口文件无效。")
        return {
          body: Buffer.from(invalidHtml, "utf8"),
          contentType: "text/html; charset=utf-8",
        }
      }
    }
    const rewritten = rewriteHtmlForPreviewSubpath(rel, html)
    body = Buffer.from(rewritten, "utf8")
  }
  return { body, contentType }
}
