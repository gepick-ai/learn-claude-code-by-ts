import fs from "node:fs"
import path from "node:path"
import { mkdir } from "node:fs/promises"
import { ensureClientProjectTemplate } from "./scaffold-client"
import { findMonorepoRoot } from "../../util/monorepo-root"

export { findMonorepoRoot }

/** `APP_PROJECT_PATH` 未设置时为 `<monorepo>/.projects`；相对路径相对 monorepo 根解析。 */
export function getProjectsRoot(): string {
  const env = process.env.APP_PROJECT_PATH?.trim()
  if (env) {
    return path.isAbsolute(env)
      ? path.normalize(env)
      : path.resolve(findMonorepoRoot(), env)
  }
  return path.join(findMonorepoRoot(), ".projects")
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
