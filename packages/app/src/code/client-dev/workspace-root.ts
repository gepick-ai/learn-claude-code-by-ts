import fs from "node:fs"
import path from "node:path"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { ensureClientProjectTemplate } from "./scaffold-client"

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))

/** 向上查找包含 `package.json` 且声明 `workspaces` 的目录（monorepo 根）。 */
export function findMonorepoRoot(): string {
  let dir = MODULE_DIR
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
      return process.cwd()
    }
    dir = parent
  }
}

/** `APP_PROJECT_PATH` 或未设置时 `<monorepo>/.projects`。 */
export function getProjectsRoot(): string {
  const env = process.env.APP_PROJECT_PATH?.trim()
  if (env) {
    return path.resolve(env)
  }
  return path.resolve(findMonorepoRoot(), ".projects")
}

export function assertSafeProjectId(projectId: string): void {
  if (!projectId || typeof projectId !== "string") {
    throw new Error("projectId is required")
  }
  if (
    projectId.includes("..") ||
    projectId.includes("/") ||
    projectId.includes("\\") ||
    projectId.includes("\0")
  ) {
    throw new Error("Invalid projectId: path traversal or illegal characters")
  }
}

/** `path.resolve(projectsRoot, projectId)`，并校验 `projectId`。 */
export function resolveAbsoluteProjectDir(projectId: string): string {
  assertSafeProjectId(projectId)
  return path.resolve(getProjectsRoot(), projectId)
}

/** 创建 `{projectsRoot}/{projectId}` 与占位 README（幂等）；不执行 git init。 */
export async function ensureCodeWorkspace(projectId: string): Promise<{
  absoluteProjectDir: string
  projectsRoot: string
}> {
  assertSafeProjectId(projectId)
  const projectsRoot = getProjectsRoot()
  const absoluteProjectDir = path.resolve(projectsRoot, projectId)
  await mkdir(absoluteProjectDir, { recursive: true })
  const readmePath = path.join(absoluteProjectDir, "README.md")
  if (!fs.existsSync(readmePath)) {
    await Bun.write(
      readmePath,
      `# Project workspace\n\nprojectId: \`${projectId}\`\n\nThis directory is the authoritative code workspace for this project (v2, no git in workspace).\n`,
    )
  }
  await ensureClientProjectTemplate(absoluteProjectDir)
  return { absoluteProjectDir, projectsRoot }
}
