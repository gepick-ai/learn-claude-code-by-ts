/**
 * 部分模型会把整段可见回复放在 JSON 里（如 `{"toolcall":[{"name":"finish","params":{"summary":"..."}}]}`），
 * 与 AI SDK 的 tool 流式事件无关。此处把这类纯文本快照还原成应对用户展示的正文。
 */
function stripOptionalMarkdownFence(text: string): string {
  const t = text.trim()
  const m = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(t)
  if (m?.[1]) return m[1].trim()
  return t
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export function unwrapToolcallDisplayText(raw: string): string {
  const candidate = stripOptionalMarkdownFence(raw)
  if (!candidate.startsWith("{")) return raw

  try {
    const parsed: unknown = JSON.parse(candidate)
    if (!isRecord(parsed)) return raw

    const toolcall = parsed.toolcall
    if (!Array.isArray(toolcall)) return raw

    const summaries: string[] = []
    for (const item of toolcall) {
      if (!isRecord(item)) continue
      if (item.name !== "finish") continue
      const params = item.params
      if (!isRecord(params)) continue
      const summary = params.summary
      if (typeof summary === "string" && summary.trim()) summaries.push(summary.trim())
    }

    if (summaries.length > 0) return summaries.join("\n\n")
    return raw
  } catch {
    return raw
  }
}
