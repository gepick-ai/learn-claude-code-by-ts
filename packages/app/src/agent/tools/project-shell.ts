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

export function createProjectBash(absoluteProjectDir: string) {
  const BashInputSchema = z.object({
    command: z.string(),
  })
  return fn(BashInputSchema, async ({ command }) => {
    if (isBlockedShellCommand(command)) {
      return "Error: git commands are disabled (v2 workspace has no git tooling)"
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
          return `[exit ${code}]\n${summary}`
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
