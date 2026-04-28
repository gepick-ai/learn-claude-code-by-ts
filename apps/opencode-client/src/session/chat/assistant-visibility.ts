import type { SessionMessage } from "@agent-dev/opencode-sdk"

/**
 * 是否已有**可见**的助手流式内容（含 reasoning / tool，不含 ignored/synthetic 的空壳 text）。
 * 用于在仍 `sendLoading` 时隐藏底部「正在生成…」，避免与上方流式内容重复。
 */
export function hasVisibleAssistantStreamContent(items: SessionMessage[]): boolean {
  for (const sm of items) {
    if (sm.message.role !== "assistant") continue
    for (const p of sm.parts) {
      if (p.type === "text") {
        if (p.ignored || p.synthetic) continue
        if (p.text.length > 0) return true
        continue
      }
      if (p.type === "reasoning" && p.text.trim().length > 0) return true
      if (p.type === "tool") return true
    }
  }
  return false
}

/**
 * 在 GET message 全量写回时，对同一 `messageId`+`partId` 的 text/reasoning 取**更长**的文本，
 * 避免偶发比 SSE 合并不完整的服务端读导致「一刷新就变空白」。
 */
export function preferRicherLocalParts(
  fromServer: SessionMessage[],
  previous: SessionMessage[] | undefined,
): SessionMessage[] {
  if (!previous?.length) return fromServer
  const byMessageId = new Map(previous.map((m) => [m.message.id, m]))
  return fromServer.map((sm) => {
    if (sm.message.role !== "assistant") return sm
    const old = byMessageId.get(sm.message.id)
    if (!old) return sm
    const byPart = new Map(old.parts.map((p) => [p.id, p]))
    const parts = sm.parts.map((p) => {
      const o = byPart.get(p.id)
      if (!o || p.type !== o.type) return p
      if (p.type === "text" && o.type === "text" && o.text.length > p.text.length) {
        return { ...p, text: o.text }
      }
      if (p.type === "reasoning" && o.type === "reasoning" && o.text.length > p.text.length) {
        return { ...p, text: o.text }
      }
      return p
    })
    return { ...sm, parts }
  })
}
