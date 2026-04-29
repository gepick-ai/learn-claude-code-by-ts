import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * 解析 gepick monorepo 根目录（含 `package.json` 且声明 `workspaces`）。
 * 开发与非容器场景下 `.data` / `.projects` 均锚定于此目录，不回退到 `packages/app`。
 * 仅在「目录树中找不到 workspaces 根」时抛出；容器等场景请设置绝对路径的 `APP_DB_PATH` / `APP_PROJECT_PATH`。
 */
export function findMonorepoRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  while (true) {
    const pkgPath = path.join(dir, "package.json")
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { workspaces?: unknown }
        if (pkg.workspaces != null) {
          return dir
        }
      } catch {
        // ignore invalid package.json
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      throw new Error(
        "gepick monorepo root not found (expected package.json with workspaces). Set APP_DB_PATH / APP_PROJECT_PATH to absolute paths when running outside the repo.",
      )
    }
    dir = parent
  }
}
