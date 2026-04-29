import path from "node:path"

/** 将相对路径解析到 project 根下，并拒绝穿越出根目录。 */
export function resolveInsideProjectRoot(absoluteProjectDir: string, rel: string): string {
  const root = path.resolve(absoluteProjectDir)
  const trimmed = rel.trim()
  // 兼容 agent 传绝对路径：若已在 workspace root 内则放行；否则拒绝。
  if (path.isAbsolute(trimmed)) {
    const abs = path.resolve(trimmed)
    const sep = path.sep
    if (abs === root || abs.startsWith(root + sep)) {
      return abs
    }
    throw new Error("Absolute paths are not allowed outside the project workspace root.")
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
