import { apiUrl } from "@/util/api-base"
import { useSessionStore } from "../../session-store"
import type { Part } from "@gepick/sdk"
import { isRecord } from "./is-record"
import { createRefCountedEventSource } from "./ref-counted-event-source"

type SsePayload = { type: string; properties?: Record<string, unknown> }

const { acquire, release } = createRefCountedEventSource({
  url: apiUrl("/sse/event"),
})

function onSseMessage(ev: MessageEvent) {
  let o: SsePayload
  try {
    o = JSON.parse(ev.data) as SsePayload
  } catch {
    return
  }
  const t = o.type
  if (t === "server.heartbeat" || t === "server.connected") return
  const { applySsePartUpdated, applySsePartDelta } = useSessionStore.getState()
  if (t === "session.part.updated") {
    const part = o.properties?.part
    if (isRecord(part) && typeof part.id === "string" && typeof part.messageId === "string") {
      applySsePartUpdated(part as Part)
    }
    return
  }
  if (t === "session.part.delta") {
    const p = o.properties
    if (!isRecord(p)) return
    const { sessionId, messageId, partId, field, delta } = p
    if (
      typeof sessionId === "string" &&
      typeof messageId === "string" &&
      typeof partId === "string" &&
      typeof field === "string" &&
      typeof delta === "string"
    ) {
      applySsePartDelta({ sessionId, messageId, partId, field, delta })
    }
  }
}

/**
 * 与 `useSessionSse` 成对使用：同一页只维持一条到 `/sse/event` 的连接，StrictMode 下不反复创建/关闭。
 */
export function acquireSessionSse(): void {
  acquire(onSseMessage)
}

export function releaseSessionSse(): void {
  release()
}
