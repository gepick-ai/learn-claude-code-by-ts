import { loop } from "../../agent/prompt"
import z from "zod"
import { ensureCodeWorkspace } from "../../code/client-dev/workspace-root"
import { Message, Session, SessionMessage, TextPart, ToolPart } from "./model"
import { Identifier } from "../../util/id"
import { messageModel, partModel, sessionModel } from "./dao"
import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai"
import { formatChinaDateTimeToSeconds } from "../../util/format-china-datetime"

export const PartInput = z.discriminatedUnion("type", [
  TextPart.omit({
    messageId: true,
    sessionId: true,
  })
    .partial({
      id: true,
    })
    .meta({
      ref: "TextPartInput",
    }),
  ToolPart.omit({
    messageId: true,
    sessionId: true,
  })
    .partial({
      id: true,
    })
    .meta({
      ref: "ToolPartInput",
    }),
])

export const PromptInput = z.object({
  sessionId: z.string(),
  parts: z.array(PartInput),
})

export const ListSessionsInput = z.object({
  limit: z.number().optional(),
})

export const GetMessagesInput = z.object({
  sessionId: z.string(),
  limit: z.number().optional(),
})

export const CreateAssistantMessageInput = z.object({
  sessionId: z.string(),
})
export type CreateAssistantMessageInput = z.infer<typeof CreateAssistantMessageInput>

class SessionService {
  async createSession(projectId: string) {
    const now = Date.now()
    const session: Session = {
      id: Identifier.descending("session"),
      projectId,
      title: formatChinaDateTimeToSeconds(now),
      createdAt: now,
      updatedAt: now,
    }

    await ensureCodeWorkspace(projectId)
    await sessionModel.createSession(session)

    return session
  }

  async listSessions(query: z.infer<typeof ListSessionsInput>): Promise<Session[]> {
    const sessions = [] as Session[]

    for await (const session of sessionModel.listSessions(query)) {
      sessions.push(session)
    }

    return sessions
  }

  async getSession(sessionId: string): Promise<Session> {
    const row = await sessionModel.getSession(sessionId);

    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await sessionModel.deleteSession(sessionId)
    } catch (err) {
      console.error(err)
    }
  }
}

export const sessionService = new SessionService()

class MessageService {
  async prompt(input: z.input<typeof PromptInput>) {
    const parsed = PromptInput.parse(input)
    await this.createUserSessionMessage(parsed)
    return loop({ sessionId: parsed.sessionId })
  }

  async listMessages(input: z.infer<typeof GetMessagesInput>): Promise<SessionMessage[]> {
    const messages = [] as SessionMessage[]

    for await (const msg of messageModel.getMessages(input.sessionId)) {
      if (input.limit && messages.length >= input.limit) break
      messages.push(msg)
    }
    messages.reverse();
    return messages
  }

  /**
   * 将持久化的 `SessionMessage` 转成 AI SDK 的 `ModelMessage[]`。
   * 思路对齐 opencode `MessageV2.toModelMessages`：先组 `UIMessage`（含 tool-* parts），再 `convertToModelMessages`。
   */
  toModelMessages(messages: SessionMessage[]): ModelMessage[] {
    const uiMessages: UIMessage[] = []
    const toolNames = new Set<string>()

    const toModelOutput = (output: unknown) => {
      switch (typeof output) {
        case "string":
          return { type: "text" as const, value: output }
        default:
          return { type: "json", value: output }
      }
    }

    for (const sessionMessage of messages) {
      if (sessionMessage.parts.length === 0) continue

      const { message, parts } = sessionMessage

      if (message.role === "user") {
        const userMessage: UIMessage = { id: message.id, role: "user", parts: [] }

        for (const p of parts) {
          if (p.type === "text" && !p.ignored) {
            userMessage.parts.push({ type: "text", text: p.text })
          }
        }

        if (userMessage.parts.length > 0) {
          uiMessages.push(userMessage)
        }
      }

      if (message.role === "assistant") {
        const assistantMessage: UIMessage = { id: message.id, role: "assistant", parts: [] }

        for (const part of parts) {
          switch (part.type) {
            case "reasoning": {
              assistantMessage.parts.push({ type: "reasoning", text: part.text })
              break;
            }
            case "tool": {
              switch (part.state.status) {
                case "error": {
                  assistantMessage.parts.push({
                    type: ("tool-" + part.tool) as `tool-${string}`,
                    state: "output-error",
                    toolCallId: part.callId,
                    input: part.state.input,
                    errorText: part.state.error,
                  })
                  break;
                }
                case "completed": {
                  assistantMessage.parts.push({
                    type: ("tool-" + part.tool) as `tool-${string}`,
                    state: "output-available",
                    toolCallId: part.callId,
                    input: part.state.input,
                    output: part.state.output,
                  })
                  break;
                }
                // @ts-ignore
                case "pending":
                case "running": {
                  assistantMessage.parts.push({
                    type: ("tool-" + part.tool) as `tool-${string}`,
                    state: "output-error",
                    toolCallId: part.callId,
                    input: part.state.input,
                    errorText: "[Tool execution was interrupted]"
                  })
                }
              }
              break;
            }
            case "text": {
              assistantMessage.parts.push({ type: "text", text: part.text })
              break;
            }
          }
        }

        if (assistantMessage.parts.length > 0) {
          uiMessages.push(assistantMessage)
        }
      }
    }

    const tools = Object.fromEntries([...toolNames].map((toolName) => [toolName, { toModelOutput }]))

    return convertToModelMessages(uiMessages, {
      //@ts-expect-error (convertToModelMessages expects a ToolSet but only actually needs tools[name]?.toModelOutput)
      tools
    })
  }

  async createUserSessionMessage(input: z.infer<typeof PromptInput>) {
    const message: Message = {
      id: Identifier.ascending("message"),
      sessionId: input.sessionId,
      role: "user" as const,
      createdAt: Date.now(),
    }
    const parts = input.parts.map((part) => ({
      ...part,
      id: part.id ?? Identifier.ascending("part"),
      sessionId: input.sessionId,
      messageId: message.id
    }))

    await messageModel.updateMessage(message)
    for (const part of parts) {
      await partModel.updatePart(part)
    }

    return { message, parts }
  }

  async createAssistantMessage(input: CreateAssistantMessageInput) {
    const message: Message = {
      id: Identifier.ascending("message"),
      sessionId: input.sessionId,
      role: 'assistant' as const,
      createdAt: Date.now(),

    }

    await messageModel.updateMessage(message);

    return message;
  }

}

export const messageService = new MessageService()
