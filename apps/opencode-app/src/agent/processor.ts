import { LLM, type StreamInput } from "./llm"
import type { AssistantMessage, ReasoningPart, TextPart, ToolPart } from "../server/session/model"
import { Identifier } from "../util/id"
import { partModel } from "../server/session/dao"

const RETRY_LIMIT = 2

export namespace Processor {
  export function create(input: {
    sessionId: string
    assistantMessage: AssistantMessage
  }) {
    const toolPartMap = new Map<string, ToolPart>()
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
            const reasoningPartMap = new Map<string, ReasoningPart>()
            const textPartMap = new Map<string, TextPart>()

            const result = LLM.stream(streamInput)

            for await (const evt of result.fullStream) {
              switch (evt.type) {

                case "start": // 流开始
                  break
                case "start-step": { // 开始agent的一步
                  step += 1
                  break
                }

                // #region thinking
                case "reasoning-start": {
                  if (reasoningPartMap.has(evt.id)) continue;
                  const reasoningPart: ReasoningPart = {
                    id: Identifier.ascending("part"),
                    sessionId: input.assistantMessage.sessionId,
                    messageId: input.assistantMessage.id,
                    type: "reasoning",
                    text: "",
                  }

                  await partModel.updatePart(reasoningPart)
                  reasoningPartMap.set(evt.id, reasoningPart)

                  break
                }
                case "reasoning-delta": {
                  const reasoningPart = reasoningPartMap.get(evt.id)
                  if (reasoningPart) {
                    reasoningPart.text += evt.text
                  }
                  break
                }
                case "reasoning-end": {
                  const reasoningPart = reasoningPartMap.get(evt.id)
                  if (reasoningPart) {
                    reasoningPart.text = reasoningPart.text.trimEnd()
                    await partModel.updatePart(reasoningPart)
                    reasoningPartMap.delete(evt.id)
                  }
                  break
                }
                // #endregion thinking

                // #region tool calling
                case "tool-input-start": {
                  const toolPart:ToolPart = {
                    id: Identifier.ascending("part"),
                    sessionId: input.assistantMessage.sessionId,
                    messageId: input.assistantMessage.id,
                    type: "tool",
                    tool: evt.toolName,
                    callId: evt.id,
                  }
                  
                  await partModel.updatePart(toolPart)
                  toolPartMap.set(evt.id, toolPart)

                  break
                }
                case "tool-input-delta": break
                case "tool-input-end": break
                case "tool-call": {
                  let toolPart = toolPartMap.get(evt.toolCallId);
                  if(toolPart) {
                    toolPart = {
                      ...toolPart,
                      tool: evt.toolName,
                    }
                    await partModel.updatePart(toolPart)
                    toolPartMap.set(evt.toolCallId, toolPart)
                  }

                  break
                }
                case "tool-result": {
                  let toolPart = toolPartMap.get(evt.toolCallId);
                  if(toolPart) {
                    toolPart = {
                      ...toolPart,
                    }
                    await partModel.updatePart(toolPart)
                    toolPartMap.delete(evt.toolCallId)
                  }
                  break
                }
                case "tool-error": {
                  let toolPart = toolPartMap.get(evt.toolCallId);
                  if(toolPart) {
                    await partModel.updatePart(toolPart)
                    toolPartMap.delete(evt.toolCallId)
                  }
                  break
                }
                // #endregion tool calling

                // #region saying
                case "text-start":{
                  const textPart:TextPart  = {
                    id: Identifier.ascending("part"),
                    sessionId: input.assistantMessage.sessionId,
                    messageId: input.assistantMessage.id,
                    type: "text",
                    text: "",
                  }

                  await partModel.updatePart(textPart)
                  textPartMap.set(evt.id, textPart)

                  break
                }
                case "text-delta": {
                  const textPart = textPartMap.get(evt.id)

                  if(textPart) {
                    textPart.text += evt.text
                  }

                  break
                }
                case "text-end":{
                  const textPart = textPartMap.get(evt.id)
                  if(textPart) {
                    textPart.text = textPart.text.trimEnd()
                    await partModel.updatePart(textPart)
                    textPartMap.delete(evt.id)
                  }

                  break
                }
                // #endregion saying

                case "finish-step": {// 结束agent的一步
                  break
                }
                case "finish": {// 流结束
                  break
                }

                case "error": {
                  throw evt.error
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