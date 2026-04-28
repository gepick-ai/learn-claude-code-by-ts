import { apiUrl } from "@/lib/apiBase"
import { useSessionStore } from "../store/sessionStore"
import type { Part } from "../types"

type SsePayload = { type: string; properties?: Record<string, unknown> }

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v)
}

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

let stream: EventSource | null = null
let subscribers = 0
let closeTimer: ReturnType<typeof setTimeout> | null = null
/** 覆盖 React 18 开发态 StrictMode 的「挂载→卸挂载→再挂载」；否则第一次 `EventSource#close` 会触发 Chrome `ERR_INCOMPLETE_CHUNKED_ENCODING` 噪音。 */
const RELEASE_DELAY_MS = 500

/**
 * 与 `useSessionSse` 成对使用：同一页只维持一条到 `/sse/event` 的连接，StrictMode 下不反复创建/关闭。
 */
export function acquireSessionSse(): void {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  subscribers += 1
  if (stream) return
  const url = apiUrl("/sse/event")
  stream = new EventSource(url)
  stream.onmessage = onSseMessage
}

export function releaseSessionSse(): void {
  subscribers = Math.max(0, subscribers - 1)
  if (subscribers > 0) return
  if (closeTimer) clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    closeTimer = null
    if (subscribers > 0) return
    if (stream) {
      stream.close()
      stream = null
    }
  }, RELEASE_DELAY_MS)
}
