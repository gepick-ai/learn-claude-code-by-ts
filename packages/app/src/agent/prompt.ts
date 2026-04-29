import { getModel } from "./model"
import { createAgentTools } from "./tools"
import z from "zod"
import { Processor, NextAction } from "./processor"
import { fn } from "../util/fn"
import { messageService, sessionService } from "../server/session/service"
import type { AssistantMessage, UserMessage } from "../server/session/model"
import { ensureCodeWorkspace, getProjectsRoot, resolveAbsoluteProjectDir } from "../code/client-dev/workspace-root"

function buildSystemPrompt(projectId: string, absoluteProjectDir: string, projectsRoot: string): string {
  return [
    "You are a coding agent. Use the available tools to solve tasks. Act, don't explain.",
    "",
    "## Workspace (mandatory)",
    `projectId: ${projectId}`,
    `projectsRoot: ${projectsRoot}`,
    `absoluteProjectDir: ${absoluteProjectDir}`,
    "All read_file / write_file / edit_file paths are relative to absoluteProjectDir.",
    "bash runs with cwd fixed to absoluteProjectDir; git commands are disabled.",
    "Do not rely on paths suggested in user text as the disk root — only use tools within this workspace.",
    "",
    "## User app (Code v4): `client/`",
    "The stack is **Vite + React + JavaScript (JSX) + Tailwind** under `client/` (no TypeScript in the default template — faster path to a green **`npm run build`**). The product standard is a **bundled** app, not a hand-edited static site at the client root.",
    "",
    "### How to lay out `client/` (mandatory unless the user explicitly demands otherwise)",
    "- **Source code** belongs in **`client/src/`** (React: **`*.jsx`**, logic/helpers: **`*.js`**). Entry is **`client/src/main.jsx`** → **`client/src/App.jsx`** (more components under `client/src/` as needed).",
    "- **`client/index.html`** is only the **Vite HTML shell**: keep it minimal with **one** module entry, e.g. `<script type=\"module\" src=\"/src/main.jsx\"></script>`. Do **not** pack the whole app inline or drive it from loose scripts at the `client/` root.",
    "- **Do not** place primary application logic in **`client/*.js`** files next to `package.json` (e.g. avoid `client/game.js` as the main codebase). Implement features as **modules under `client/src/`** and import them from React.",
    "- Style with **Tailwind via the toolchain** (`tailwindcss`, `@tailwindcss/vite`) and **`client/src/index.css`** (`@import \"tailwindcss\";`). Do **not** rely on **`cdn.tailwindcss.com`** script tags as the default pattern.",
    "- Shared static files can go under **`client/public/`** when appropriate.",
    "",
    "### Build so preview works (mandatory)",
    "- The session Code panel **only** loads **`client/dist/index.html`**. If you never run **`npm run build`**, **`dist/` does not exist** and the user sees an empty preview — **writing `client/src` alone is not enough**.",
    "- After you **substantively change** the user app under **`client/`** (source, styles, **`package.json`** deps, or **`vite.config`**), you **must** run **`cd client && npm run build`** before stopping, **in the same assistant turn or immediately after your edits**, unless the user explicitly asked you **not** to build or you only touched files outside `client/` (e.g. workspace `README.md`).",
    "- If **`client/node_modules`** is missing or install is incomplete, run **`cd client && npm install`** (or `pnpm install`) **before** **`npm run build`**.",
    "- If **build fails**, use the bash output to fix **syntax / ESLint-visible / Vite rollup** errors and **run build again** until it succeeds; do not treat the task as done for preview until **`npm run build`** exits **0**.",
    "- **Reading `bash` tool output**: The tool always ends with **`[exit N]`**. **Only `N === 0` counts as success.** If you see **`COMMAND FAILED`** or **`[exit 1]`** (or any non-zero **N**), **`npm run build` did not produce `client/dist`**. Do **not** tell the user the app is built or preview-ready until you see **`[exit 0]`** after **`npm run build`**.",
    "- **Do not switch to dev server as fallback** (`npm run dev`, `vite dev`, etc.) when build fails. The Code panel preview contract is build artifacts (`client/dist`) only in v4.",
    "",
    "Do not change `client/package.json` dependency version ranges without the user’s clear request; the file is from a product template for version alignment across projects.",
  ].join("\n")
}

const LoopInput = z.object({
  sessionId: z.string(),
})

export const loop = fn(LoopInput, async ({ sessionId }): Promise<void> => {
  const session = await sessionService.getSession(sessionId)
  if (!session.projectId) {
    throw new Error("Session has no projectId; refuse agent tools without a project workspace.")
  }

  await ensureCodeWorkspace(session.projectId)
  const absoluteProjectDir = resolveAbsoluteProjectDir(session.projectId)
  const projectsRoot = getProjectsRoot()
  const systemPrompt = buildSystemPrompt(session.projectId, absoluteProjectDir, projectsRoot)
  const tools = createAgentTools({
    projectId: session.projectId,
    absoluteProjectDir,
  })

  while (true) {
    // 获取会话消息列表
    const sessionMessages = await messageService.listMessages({ sessionId })
    let lastestUserMessage: UserMessage | undefined;
    let lastestAssistantMessage: AssistantMessage | undefined;
    let lastestFinishedAssistantMessage: AssistantMessage | undefined;

    for (let i = sessionMessages.length - 1; i >= 0; i--) {
      const sessionMessage = sessionMessages[i]!;

      if (sessionMessage.message.role === "user") {
        // 找到最新用户消息
        if (!lastestUserMessage) lastestUserMessage = sessionMessage.message;
      }

      if (sessionMessage.message.role === "assistant") {
        // 找到最新助手消息
        if (!lastestAssistantMessage) lastestAssistantMessage = sessionMessage.message;
        // 找到最新完成状态的助手消息
        if (!lastestFinishedAssistantMessage && sessionMessage.message.finish) lastestFinishedAssistantMessage = sessionMessage.message;
      }

      // 如果找到最新用户消息和最新完成状态的助手消息，则退出循环
      if (lastestUserMessage && lastestFinishedAssistantMessage) break;
    }

    if (!lastestUserMessage) throw new Error("No user message found in stream. This should never happen.")

    // 如果最新助手消息是完成状态且不是tool-calls或unknown，则退出循环。即认为模型已经完成任务。
    if (lastestAssistantMessage?.finish
      && !["tool-calls", "unknown"].includes(lastestAssistantMessage.finish)
      && lastestUserMessage.id < lastestAssistantMessage.id) {
      console.info("exiting loop", { sessionId })
      break;
    }

    const assistantMessage = await messageService.createAssistantMessage({ sessionId })
    const processor = Processor.create({ sessionId, assistantMessage })

    let nextAction = await processor.process({
      sessionId,
      messages: messageService.toModelMessages(sessionMessages),
      model: getModel(),
      system: systemPrompt,
      tools,
    })

    if (nextAction === NextAction.STOP) break;
    if (nextAction === NextAction.COMPACT) {
      console.info("compacting session", { sessionId })
      // TODO: 触发会话压缩
    };
    continue;
  }
})
