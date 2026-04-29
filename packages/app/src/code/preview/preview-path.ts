import path from "node:path"

/** 预览 URL 中 `/preview/` 之后的部分（不含首尾 `/`），映射为工作区相对路径。 */
export function parsePathUnderPreview(pathAfterPreview: string): string {
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
