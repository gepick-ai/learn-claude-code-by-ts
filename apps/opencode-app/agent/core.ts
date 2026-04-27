import { streamText, stepCountIs } from "ai"
import { getModel } from "./model"
import { agentTools, toolHandlers } from "./tools"
import type { SessionMessages } from "./types"

export const MODEL = getModel()
export const SYSTEM =
  "You are a coding agent. Use the available tools to solve tasks. Act, don't explain."
export const TOOLS = agentTools
const MAX_STEPS = 30

export type PublishFn = (payload: { type: string; properties: Record<string, unknown> }) => void

export async function agentLoop(
  prompt: string,
  history: SessionMessages,
  opts?: { sessionID: string; publish?: PublishFn },
): Promise<SessionMessages> {
  const pub = opts?.publish ?? (() => {})
  const sessionID = opts?.sessionID ?? ""

  const messages: SessionMessages = [...history]
  messages.push({
    role: "user",
    content: [{ type: "text", text: prompt }],
  })
  let step = 0

  while (true) {
    step += 1
    if (step > MAX_STEPS) {
      messages.push({
        role: "assistant",
        content: [{ type: "text", text: "Error: Agent loop exceeded maximum steps" }],
      })
      return messages
    }

    pub({
      type: "step.start",
      properties: { sessionID, step },
    })

    const result = streamText({
      model: MODEL,
      system: SYSTEM,
      messages,
      tools: TOOLS,
      maxOutputTokens: 8000,
      stopWhen: stepCountIs(1),
    })

    for await (const delta of result.textStream) {
      pub({
        type: "message.delta",
        properties: { sessionID, step, text: delta },
      })
    }

    const [response, finishReason, toolCalls] = await Promise.all([
      result.response,
      result.finishReason,
      result.toolCalls,
    ])

    messages.push(...response.messages)

    pub({
      type: "step.finish",
      properties: { sessionID, step, finishReason },
    })

    if (finishReason !== "tool-calls") {
      return messages
    }

    const toolResults = []

    for (const toolCall of toolCalls) {
      pub({
        type: "tool.call",
        properties: {
          sessionID,
          step,
          name: toolCall.toolName,
          callId: toolCall.toolCallId,
        },
      })

      const handler = toolHandlers[toolCall.toolName as keyof typeof toolHandlers]

      let output: string
      if (!handler) {
        output = `Unknown tool: ${toolCall.toolName}`
      } else {
        try {
          output = await handler(toolCall.input as never)
        } catch (error) {
          output = `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        }
      }

      pub({
        type: "tool.result",
        properties: {
          sessionID,
          step,
          name: toolCall.toolName,
          callId: toolCall.toolCallId,
          output: output.length > 2000 ? `${output.slice(0, 2000)}…` : output,
        },
      })

      toolResults.push({
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        output,
      })
    }

    messages.push({
      role: "tool",
      content: toolResults.map((r) => ({
        type: "tool-result" as const,
        toolCallId: r.toolCallId,
        toolName: r.toolName,
        output: {
          type: "text" as const,
          value: r.output,
        },
      })),
    })
  }
}
