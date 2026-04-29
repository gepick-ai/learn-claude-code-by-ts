import { tool } from "ai"
import { z } from "zod"
import {
  createProjectEditFile,
  createProjectReadFile,
  createProjectWriteFile,
} from "./tools/project-fs"
import { createProjectBash } from "./tools/project-shell"
import { withProjectToolLock } from "./tools/project-lock"
import type { Tool } from "ai"

export type AgentToolContext = {
  projectId: string
  absoluteProjectDir: string
}

/** 会话绑定的 project 目录内受限工具（路径与 cwd 均由服务端解析，不信任模型自拟根路径）。 */
export function createAgentTools(ctx: AgentToolContext): Record<string, Tool> {
  const bashRun = createProjectBash(ctx.absoluteProjectDir)
  const readRun = createProjectReadFile(ctx.absoluteProjectDir)
  const writeRun = createProjectWriteFile(ctx.absoluteProjectDir)
  const editRun = createProjectEditFile(ctx.absoluteProjectDir)

  const lock = <T>(fn: (input: unknown) => Promise<T>) => {
    return async (input: unknown) =>
      withProjectToolLock(ctx.projectId, () => fn(input))
  }

  return {
    bash: tool({
      description:
        "Run a shell command. cwd is the **project workspace root** (parent of `client/`). Return value includes **`[exit N]`**: **only N=0 is success**. Non-zero means the command failed (e.g. **`npm run build`** did not produce **`client/dist`** — fix Vite/JS errors from stderr/stdout). After editing **`client/`**, run **`cd client && npm run build`** until **`[exit 0]`**. Git is disabled.",
      inputSchema: z.object({
        command: z.string().describe("The shell command to execute."),
      }),
      execute: lock(async (input) => await bashRun(input)),
    }),
    read_file: tool({
      description:
        "Read file contents relative to the session project workspace root (absolute paths outside the workspace are rejected).",
      inputSchema: z.object({
        path: z.string().describe("Path relative to the project workspace root."),
        limit: z
          .number()
          .int()
          .optional()
          .describe("Optional maximum number of lines to return."),
      }),
      execute: lock(async (input) => await readRun(input)),
    }),
    write_file: tool({
      description:
        "Write a file under the workspace root. For **`client/`**, follow the Vite layout: application code under **`client/src/`**, not ad-hoc **`client/*.js`** at the client folder root for main app logic; keep **`client/index.html`** as a thin Vite shell.",
      inputSchema: z.object({
        path: z.string().describe("Path relative to the project workspace root."),
        content: z.string().describe("The full content to write to the file."),
      }),
      execute: lock(async (input) => await writeRun(input)),
    }),
    edit_file: tool({
      description: "Replace exact text in a file under the session project workspace root.",
      inputSchema: z.object({
        path: z.string().describe("Path relative to the project workspace root."),
        old_text: z.string().describe("The exact text to replace."),
        new_text: z.string().describe("The replacement text."),
      }),
      execute: lock(async (input) => await editRun(input)),
    }),
  }
}
