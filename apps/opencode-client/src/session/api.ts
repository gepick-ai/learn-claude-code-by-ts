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

/** 与会话资源 `GET /session` 对齐；服务端按最近更新时间排序。 */
export async function listSessions(options?: { limit?: number }): Promise<SessionMeta[]> {
  const params = new URLSearchParams()
  if (options?.limit != null) params.set("limit", String(options.limit))
  const q = params.toString()
  const res = await fetch(apiUrl(`/session${q ? `?${q}` : ""}`))
  const raw = await readTextSafe(res)
  if (!res.ok) throw new Error(`list sessions failed: ${res.status}`)
  if (!raw.trim()) return []
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error("list sessions: invalid JSON")
  }
  if (!Array.isArray(data)) return []
  const out: SessionMeta[] = []
  for (const e of data) {
    if (e && typeof e === "object" && "id" in e && "title" in e) {
      const o = e as { id: unknown; title: unknown; createdAt?: unknown; updatedAt?: unknown }
      if (typeof o.id === "string" && typeof o.title === "string") {
        out.push({
          id: o.id,
          title: o.title,
          createdAt: typeof o.createdAt === "number" ? o.createdAt : 0,
          updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : 0,
        })
      }
    }
  }
  return out
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

/** 删除成功返回 `ok`；服务端已无该会话时返回 `gone`（仍可清理本地列表）。 */
export async function deleteSession(sessionId: string): Promise<"ok" | "gone"> {
  const res = await fetch(apiUrl(`/session/${encodeURIComponent(sessionId)}`), { method: "DELETE" })
  const raw = await readTextSafe(res)
  if (res.ok) {
    if (raw.trim()) {
      try {
        const data = JSON.parse(raw) as unknown
        if (data === true) return "ok"
      } catch {
        /* 仍视为成功 */
      }
    }
    return "ok"
  }
  if (res.status === 404) return "gone"
  let err = `delete session failed: ${res.status}`
  if (raw.trim()) {
    try {
      const j = JSON.parse(raw) as { error?: string }
      if (typeof j?.error === "string") err = j.error
    } catch {
      /* 使用默认 err */
    }
  }
  throw new Error(err)
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
