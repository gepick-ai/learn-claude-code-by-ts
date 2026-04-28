import type { SessionMessage, TextPart } from "@gepick/sdk"
import { extractHtmlFromMessage } from "./extract-html-from-message"

export type CodeViewModel =
  | { status: "empty" }
  | { status: "ready"; html: string; source: "workspace" | "chat-fallback" }
  | { status: "error"; error: string; source?: "workspace" | "chat-fallback" }
  | { status: "pending" }

function collectAssistantText(message: SessionMessage): string {
  if (message.message.role !== "assistant") return ""
  return message.parts
    .filter((part): part is TextPart => part.type === "text" && !part.ignored && !part.synthetic)
    .map((part) => part.text)
    .join("\n")
    .trim()
}

/**
 * **v1 / 降级路径**：仅从助手正文抽取 HTML，可能与磁盘工作区不一致。
 * 生产环境应以工作区 + `projectId` 为预览真相（v3 为受控预览 URL，v2 只读 API 用于存在性检测等）。
 */
export function buildFallbackCodeViewModelFromMessages(messages: SessionMessage[]): CodeViewModel {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const text = collectAssistantText(messages[i]!)
    if (!text) continue
    const extracted = extractHtmlFromMessage(text)
    if (extracted.status === "ready") {
      return { status: "ready", html: extracted.html, source: "chat-fallback" }
    }
    if (extracted.status === "incomplete") return { status: "pending" }
    return { status: "error", error: extracted.error, source: "chat-fallback" }
  }
  return { status: "empty" }
}
