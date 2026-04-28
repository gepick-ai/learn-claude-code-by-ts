import path from "node:path"

/** 将相对路径解析到 project 根下，并拒绝穿越出根目录。 */
export function resolveInsideProjectRoot(absoluteProjectDir: string, rel: string): string {
  const root = path.resolve(absoluteProjectDir)
  const trimmed = rel.trim()
  // POSIX: path.resolve(root, '/etc/passwd') → '/etc/passwd'；禁止绝对路径，只用相对路径拼接。
  if (path.isAbsolute(trimmed)) {
    throw new Error("Absolute paths are not allowed; use paths relative to the project workspace root.")
  }
  const normalized =
    path.sep === "\\" ? trimmed.replace(/^[/\\]+/, "") : trimmed.replace(/^\/+/, "")
  const target = path.resolve(root, normalized)
  const sep = path.sep
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error(`Path escapes project workspace: ${rel}`)
  }
  return target
}
