import { sdk } from "@/util/sdk"
import type { CreateSessionResponse, SessionMessage, SessionMeta } from "./types"

/** SDK `responseStyle: "data"` 会直接返回解析后的 JSON；仅部分接口为 `{ data, error }` 包装。 */
function data<T>(input: T | { data?: T; error?: unknown }, msg: string): T {
  if (input !== null && typeof input === "object" && "error" in input) {
    const err = (input as { error?: unknown }).error
    if (err) {
      if (err instanceof Error) throw err
      throw new Error(`${msg}: ${String(err)}`)
    }
  }
  if (
    input !== null &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    "data" in input
  ) {
    const v = (input as { data?: T }).data
    if (v === undefined) throw new Error(`${msg}: empty response body`)
    return v
  }
  if (input === undefined) throw new Error(`${msg}: empty response body`)
  return input as T
}

function mapSessionMeta(input: { id: string; title?: string; name?: string; createdAt?: number | string; updatedAt?: number }) {
  return {
    id: input.id,
    title: input.title ?? input.name ?? "Untitled",
    createdAt:
      typeof input.createdAt === "number"
        ? input.createdAt
        : typeof input.createdAt === "string"
          ? Date.parse(input.createdAt) || 0
          : 0,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : 0,
  } satisfies SessionMeta
}

export async function createSession(): Promise<CreateSessionResponse> {
  const created = data(await sdk.session.create(), "create session failed")
  return {
    sessionId: created.sessionId,
    session: mapSessionMeta(created.session),
  }
}

/** 与会话资源 `GET /session` 对齐；服务端按最近更新时间排序。 */
export async function listSessions(options?: { limit?: number }): Promise<SessionMeta[]> {
  const list = data(await sdk.session.list(options), "list sessions failed")
  return list.map((item) => mapSessionMeta(item))
}

export async function deleteSession(sessionId: string): Promise<"ok" | "gone"> {
  try {
    await sdk.session.delete({ sessionId })
    return "ok"
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("404")) return "gone"
    throw err
  }
}

export async function getMessages(sessionId: string): Promise<SessionMessage[]> {
  const list = data(await sdk.session.messages({ sessionId }), "get messages failed")
  return Array.isArray(list) ? (list as SessionMessage[]) : []
}

export type PostMessageBody = { parts: Array<{ type: "text"; text: string }> }

export async function postUserMessage(
  sessionId: string,
  body: PostMessageBody,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = data(await sdk.session.prompt({ sessionId, parts: body.parts }), "send message failed")
    if (typeof result.success === "boolean") return { success: result.success }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}
