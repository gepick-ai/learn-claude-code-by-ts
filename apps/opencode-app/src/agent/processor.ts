import { LLM, type StreamInput } from "./llm"
import type { AssistantMessage, ReasoningPart } from "../server/session/model"
import { Identifier } from "../util/id"
import { partModel } from "../server/session/dao"

const RETRY_LIMIT = 2

export namespace Processor {
  export function create(input: {
    sessionId: string
    assistantMessage: AssistantMessage
  }) {
    let step = 0
    let blocked = false

    const processor = {
      get message() {
        return input.assistantMessage
      },
      get step() {
        return step
      },
      async process(streamInput: StreamInput) {
        let attempt = 0
        while (true) {
          try {
            const reasoningMap = new Map<string, ReasoningPart>()
            const toolInputMap = new Map<string, string>()

            const result = LLM.stream(streamInput)

            for await (const part of result.fullStream) {
              switch (part.type) {

                case "start": // 流开始
                  break
                case "start-step": { // 开始agent的一步
                  step += 1
                  break
                }

                // #region thinking
                case "reasoning-start": {
                  if (reasoningMap.has(part.id)) continue;
                  const reasoningPart: ReasoningPart = {
                    id: Identifier.ascending("part"),
                    sessionId: input.assistantMessage.sessionId,
                    messageId: input.assistantMessage.id,
                    type: "reasoning",
                    text: "",
                  }
                  reasoningMap.set(part.id, reasoningPart)
                  await partModel.updatePart(reasoningPart)
                  break
                }
                case "reasoning-delta": {
                  const reasoningPart = reasoningMap.get(part.id)
                  if (reasoningPart) {
                    reasoningPart.text += part.text
                  }
                  break
                }
                case "reasoning-end": {
                  const reasoningPart = reasoningMap.get(part.id)
                  if (reasoningPart) {
                    reasoningPart.text = reasoningPart.text.trimEnd()
                    await partModel.updatePart(reasoningPart)
                    reasoningMap.delete(part.id)
                  }
                  break
                }
                // #endregion thinking

                // #region tool calling
                case "tool-input-start": {
                  toolInputMap.set(part.id, "")
                  break
                }
                case "tool-input-delta": {
                  if (!toolInputMap.has(part.id)) break
                  toolInputMap.set(part.id, `${toolInputMap.get(part.id) ?? ""}${part.delta}`)
                  break
                }
                case "tool-input-end": {
                  if (!toolInputMap.has(part.id)) break
                  toolInputMap.set(part.id, (toolInputMap.get(part.id) ?? "").trimEnd())
                  break
                }
                case "tool-call": {
                  break
                }
                case "tool-result": {
                  toolInputMap.delete(part.toolCallId)
                  break
                }
                case "tool-error": {
                  toolInputMap.delete(part.toolCallId)
                  break
                }
                // #endregion tool calling

                // #region saying
                case "text-start":
                  break
                case "text-delta": {
                  break
                }
                case "text-end":
                  break
                // #endregion saying

                case "finish-step": {// 结束agent的一步
                  break
                }
                case "finish": {// 流结束
                  break
                }

                case "error": {
                  throw part.error
                }

                default:
                  break
              }
            }

          } catch (err) {
            attempt += 1
            if (attempt > RETRY_LIMIT) {
              return {
                status: "stop" as const,
              }
            }
          }

          if (input.assistantMessage.error) return "stop"
          if (blocked) return "stop"
          return "continue"
        }
      },
    }

    return processor
  }
}