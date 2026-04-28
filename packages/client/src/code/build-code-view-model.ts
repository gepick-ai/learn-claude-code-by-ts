import type { SessionMessage } from "@gepick/sdk"
import { extractHtmlFromMessage } from "./extract-html-from-message"

export type CodeViewModel =
  | { status: "empty" }
  | { status: "ready"; html: string }
  | { status: "error"; error: string }
  | { status: "pending" }

function collectAssistantText(message: SessionMessage): string {
  if (message.message.role !== "assistant") return ""
  return message.parts
    .filter((part) => part.type === "text" && !part.ignored && !part.synthetic)
    .map((part) => part.text)
    .join("\n")
    .trim()
}

export function buildCodeViewModel(messages: SessionMessage[]): CodeViewModel {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const text = collectAssistantText(messages[i]!)
    if (!text) continue
    const extracted = extractHtmlFromMessage(text)
    if (extracted.status === "ready") return { status: "ready", html: extracted.html }
    if (extracted.status === "incomplete") return { status: "pending" }
    return { status: "error", error: extracted.error }
  }
  return { status: "empty" }
}
