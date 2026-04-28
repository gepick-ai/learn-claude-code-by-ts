import { LLM, type StreamInput } from "./llm"
import type { AssistantMessage, ReasoningPart, TextPart, ToolPart } from "../server/session/model"
import { Identifier } from "../util/id"
import { messageModel, partModel } from "../server/session/dao"
import { SessionRetry } from "./retry"

const RETRY_LIMIT = 2

export enum NextAction {
  CONTINUE = "continue",
  STOP = "stop",
  COMPACT = "compact",
}

export namespace Processor {
  export function create(input: {
    sessionId: string
    assistantMessage: AssistantMessage
  }) {
    const toolPartMap = new Map<string, ToolPart>()
    let step = 0
    let blocked = false
    let attempt = 0
    let needsCompaction = false

    const processor = {
      get message() {
        return input.assistantMessage
      },
      get step() {
        return step
      },
      async process(streamInput: StreamInput) {
        needsCompaction = false;
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
                    await partModel.updatePartDelta({
                      sessionId: reasoningPart.sessionId,
                      messageId: reasoningPart.messageId,
                      partId: reasoningPart.id,
                      field: "text",
                      delta: evt.text,
                    })
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
                  const toolPart: ToolPart = {
                    id: Identifier.ascending("part"),
                    sessionId: input.assistantMessage.sessionId,
                    messageId: input.assistantMessage.id,
                    type: "tool",
                    callId: evt.id,
                    tool: evt.toolName,
                    state: {
                      status: "pending",
                      input: {},
                    }
                  }

                  await partModel.updatePart(toolPart)
                  toolPartMap.set(evt.id, toolPart)

                  break
                }
                case "tool-input-delta": break
                case "tool-input-end": break
                case "tool-call": {
                  let toolPart = toolPartMap.get(evt.toolCallId);
                  if (toolPart) {
                    toolPart = {
                      ...toolPart,
                      tool: evt.toolName,
                      state: {
                        status: "running",
                        input: evt.input
                      }
                    }
                    await partModel.updatePart(toolPart)
                    toolPartMap.set(evt.toolCallId, toolPart)
                  }

                  break
                }
                case "tool-result": {
                  let toolPart = toolPartMap.get(evt.toolCallId);
                  if (toolPart && toolPart.state.status === "running") {
                    toolPart = {
                      ...toolPart,
                      state: {
                        status: "completed",
                        input: evt.input ?? toolPart.state.input,
                        output: evt.output.output
                      }
                    }
                    await partModel.updatePart(toolPart)
                    toolPartMap.delete(evt.toolCallId)
                  }
                  break
                }
                case "tool-error": {
                  let toolPart = toolPartMap.get(evt.toolCallId);
                  if (toolPart && toolPart.state.status === "running") {
                    toolPart = {
                      ...toolPart,
                      state: {
                        status: "error",
                        input: evt.input ?? toolPart.state.input,
                        error: (evt.error as any).toString()
                      }
                    }
                    await partModel.updatePart(toolPart)
                    toolPartMap.delete(evt.toolCallId)
                  }
                  break
                }
                // #endregion tool calling

                // #region saying
                case "text-start": {
                  const textPart: TextPart = {
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

                  if (textPart) {
                    textPart.text += evt.text
                    await partModel.updatePartDelta({
                      sessionId: textPart.sessionId,
                      messageId: textPart.messageId,
                      partId: textPart.id,
                      field: "text",
                      delta: evt.text,
                    })
                  }

                  break
                }
                case "text-end": {
                  const textPart = textPartMap.get(evt.id)
                  if (textPart) {
                    textPart.text = textPart.text.trimEnd()
                    await partModel.updatePart(textPart)
                    textPartMap.delete(evt.id)
                  }

                  break
                }
                // #endregion saying

                case "finish-step": {// 结束agent的一步
                  input.assistantMessage.finish = evt.finishReason
                  break
                }
                case "finish": {// 流结束
                  break
                }

                case "error": {
                  throw evt.error
                }

                default: continue
              }
            }
          } catch (err: any) {
            console.error("process", {
              error: err,
              stack: JSON.stringify(err.stack),
            })

            const error = LLM.fromError(err)

            if (LLM.ContextOverflowError.is(error)) {
              needsCompaction = true
            } else {
              const retry = SessionRetry.checkRetryable(error);
              if (retry.isRetryable) {
                attempt++
                continue

              }

              input.assistantMessage.error = error
            }
          }

          const parts = await partModel.getParts(input.assistantMessage.id)
          for (let part of parts) {
            if (part.type === "tool") {
              if (part.state.status !== "completed" && part.state.status !== "error") {
                part = {
                  ...part,
                  state: {
                    ...part.state,
                    status: "error",
                    error: "Tool execution aborted"
                  }
                }

                await partModel.updatePart(part)
              }

            }
          }

          await messageModel.updateMessage(input.assistantMessage);
          
          if (needsCompaction) return NextAction.COMPACT
          if (blocked || input.assistantMessage.error) return NextAction.STOP
          return NextAction.CONTINUE
        }
      },
    }

    return processor
  }
}