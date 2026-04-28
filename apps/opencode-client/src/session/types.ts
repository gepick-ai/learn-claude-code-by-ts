/**
 * 与 `apps/opencode-app/src/server/session/model` 结构对齐的客户端子集（不引入跨包 zod 依赖）。
 */
export type UserMessage = {
  id: string
  sessionId: string
  createdAt: number
  role: "user"
}

export type AssistantMessage = {
  id: string
  sessionId: string
  createdAt: number
  role: "assistant"
  finish?: string
  error?: string
}

export type Message = UserMessage | AssistantMessage

export type Part =
  | {
      id: string
      sessionId: string
      messageId: string
      type: "text"
      text: string
      synthetic?: boolean
      ignored?: boolean
    }
  | {
      id: string
      sessionId: string
      messageId: string
      type: "reasoning"
      text: string
    }
  | {
      id: string
      sessionId: string
      messageId: string
      type: "tool"
      callId: string
      tool: string
      state: { status: string; [k: string]: unknown }
      metadata?: Record<string, unknown>
    }

export type SessionMessage = {
  message: Message
  parts: Part[]
}

export type SessionMeta = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export type CreateSessionResponse = {
  sessionId: string
  session: SessionMeta
}
