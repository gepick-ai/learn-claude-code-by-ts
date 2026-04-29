import path from "node:path"
import { fn } from "../tool-fs/schema-fn"
import { z } from "zod"

const DANGEROUS_SNIPPETS = ["rm -rf /", "sudo", "shutdown", "reboot", "> /dev/"]

function firstCommandToken(command: string): string {
  const trimmed = command.trim()
  if (!trimmed) return ""
  const first = trimmed.split(/\s+/)[0] ?? ""
  return first.replace(/^['"]|['"]$/g, "")
}

/** v2 禁用 git：仅当以 `git` 作为首个命令词启动时拦截（嵌套 `sh -c git` 需后续增强）。 */
function isBlockedShellCommand(command: string): boolean {
  const base = path.basename(firstCommandToken(command))
  return base === "git"
}

/**
 * Code v4 禁用 dev server 兜底：预览必须消费 `client/dist` 构建产物。
 * 若用户明确要求调试 dev server，再由产品策略放开。
 */
function isBlockedDevServerCommand(command: string): boolean {
  const c = command.toLowerCase()
  return (
    /\bnpm\s+run\s+dev\b/.test(c) ||
    /\bnpm\s+dev\b/.test(c) ||
    /\bpnpm\s+run\s+dev\b/.test(c) ||
    /\bpnpm\s+dev\b/.test(c) ||
    /\byarn\s+dev\b/.test(c) ||
    /\bvite\s+dev\b/.test(c)
  )
}

export function createProjectBash(absoluteProjectDir: string) {
  const BashInputSchema = z.object({
    command: z.string(),
  })
  return fn(BashInputSchema, async ({ command }) => {
    if (isBlockedShellCommand(command)) {
      return "Error: git commands are disabled (v2 workspace has no git tooling)"
    }
    if (isBlockedDevServerCommand(command)) {
      return (
        "Error: dev server commands are disabled in Code v4 workflow. " +
        "Preview must use built artifacts: run `cd client && npm run build` (or pnpm equivalent) and verify `[exit 0]`."
      )
    }

    if (DANGEROUS_SNIPPETS.some((item) => command.includes(item))) {
      return "Error: Dangerous command blocked"
    }

    try {
      const proc = Bun.spawn(["sh", "-lc", command], {
        cwd: absoluteProjectDir,
        stdout: "pipe",
        stderr: "pipe",
      })

      const timeoutMs = 120_000

      const result = await Promise.race([
        (async () => {
          const stdout = await new Response(proc.stdout).text()
          const stderr = await new Response(proc.stderr).text()
          await proc.exited
          const code = proc.exitCode ?? 0
          const out = `${stdout}${stderr}`.trim()
          const summary = out ? out.slice(0, 50_000) : "(no output)"
          const failBanner =
            code !== 0
              ? `COMMAND FAILED — exit code ${code} (not 0). Do not treat this as success; \`client/dist\` was not produced. Fix errors below and run the command again.\n\n`
              : ""
          return `${failBanner}[exit ${code}]\n${summary}`
        })(),
        (async () => {
          await Bun.sleep(timeoutMs)
          proc.kill()
          return "Error: Timeout (120s)"
        })(),
      ])

      return result
    } catch {
      return "Error: Failed to execute command"
    }
  })
}
