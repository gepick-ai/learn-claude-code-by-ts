import { apiUrl } from "@/lib/apiBase"
import type { CreateSessionResponse, SessionMessage, SessionMeta } from "./types"

/** 避免 `res.json()` 在**空正文**或非整段 JSON 时抛 `Unexpected end of JSON input`（常见于流式结尾、代理缓冲差异）。 */
async function readTextSafe(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ""
  }
}

export async function createSession(): Promise<CreateSessionResponse> {
  const res = await fetch(apiUrl("/session"), { method: "POST" })
  const raw = await readTextSafe(res)
  if (!res.ok) throw new Error(`create session failed: ${res.status}`)
  if (!raw.trim()) throw new Error("create session: empty response body")
  let data: CreateSessionResponse
  try {
    data = JSON.parse(raw) as CreateSessionResponse
  } catch {
    throw new Error("create session: invalid JSON")
  }
  return data
}

export async function getSession(sessionId: string): Promise<SessionMeta> {
  const res = await fetch(apiUrl(`/session/${encodeURIComponent(sessionId)}`))
  const raw = await readTextSafe(res)
  if (!res.ok) throw new Error(`get session failed: ${res.status}`)
  if (!raw.trim()) throw new Error("get session: empty response body")
  try {
    return JSON.parse(raw) as SessionMeta
  } catch {
    throw new Error("get session: invalid JSON")
  }
}

export async function getMessages(sessionId: string): Promise<SessionMessage[]> {
  const res = await fetch(apiUrl(`/session/${encodeURIComponent(sessionId)}/message`))
  const raw = await readTextSafe(res)
  if (!res.ok) throw new Error(`get messages failed: ${res.status}`)
  if (!raw.trim()) return []
  try {
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data as SessionMessage[]
  } catch {
    throw new Error("get messages: invalid JSON")
  }
}

export type PostMessageBody = { parts: Array<{ type: "text"; text: string }> }

/**
 * 后端为 `stream()`，末尾 `write(JSON.stringify({ success: true }))`。
 * 开发环境经 Vite 代理时，偶发**空正文**仍 `200`，`res.json()` 会崩；空则按成功处理，由随后 `getMessages` 对齐事实。
 */
export async function postUserMessage(
  sessionId: string,
  body: PostMessageBody,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(apiUrl(`/session/${encodeURIComponent(sessionId)}/message`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const raw = await readTextSafe(res)

  if (!res.ok) {
    let err = `HTTP ${res.status}`
    if (raw.trim()) {
      try {
        const j = JSON.parse(raw) as { error?: string }
        if (typeof j?.error === "string") err = j.error
      } catch {
        /* 非 JSON 错误页 */
      }
    }
    return { success: false, error: err }
  }

  if (!raw.trim()) {
    return { success: true }
  }

  try {
    const data = JSON.parse(raw) as { success?: boolean; error?: string }
    if (typeof data.error === "string" && data.error) {
      return { success: false, error: data.error }
    }
    return { success: Boolean(data.success) }
  } catch {
    return { success: false, error: "发送：响应不是合法 JSON" }
  }
}
