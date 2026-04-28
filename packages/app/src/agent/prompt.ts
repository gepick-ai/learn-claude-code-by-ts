import { getModel } from "./model"
import { agentTools } from "./tools"
import z from "zod"
import { Processor, NextAction } from "./processor"
import { fn } from "../util/fn"
import { messageService } from "../server/session/service"
import type { AssistantMessage, UserMessage } from "../server/session/model"

export const SYSTEM =
  "You are a coding agent. Use the available tools to solve tasks. Act, don't explain."
export const TOOLS = agentTools

const LoopInput = z.object({
  sessionId: z.string(),
})

export const loop = fn(LoopInput, async ({ sessionId }): Promise<void> => {
  while (true) {
    // 获取会话消息列表
    const sessionMessages = await messageService.listMessages({ sessionId })
    let lastestUserMessage: UserMessage | undefined;
    let lastestAssistantMessage: AssistantMessage | undefined;
    let lastestFinishedAssistantMessage: AssistantMessage | undefined;

    for (let i = sessionMessages.length - 1; i >= 0; i--) {
      const sessionMessage = sessionMessages[i]!;

      if (sessionMessage.message.role === "user") {
        // 找到最新用户消息
        if (!lastestUserMessage) lastestUserMessage = sessionMessage.message;
      }

      if (sessionMessage.message.role === "assistant") {
        // 找到最新助手消息
        if (!lastestAssistantMessage) lastestAssistantMessage = sessionMessage.message;
        // 找到最新完成状态的助手消息
        if (!lastestFinishedAssistantMessage && sessionMessage.message.finish) lastestFinishedAssistantMessage = sessionMessage.message;
      }

      // 如果找到最新用户消息和最新完成状态的助手消息，则退出循环
      if (lastestUserMessage && lastestFinishedAssistantMessage) break;
    }

    if (!lastestUserMessage) throw new Error("No user message found in stream. This should never happen.")

    // 如果最新助手消息是完成状态且不是tool-calls或unknown，则退出循环。即认为模型已经完成任务。
    if (lastestAssistantMessage?.finish
      && !["tool-calls", "unknown"].includes(lastestAssistantMessage.finish)
      && lastestUserMessage.id < lastestAssistantMessage.id) {
      console.info("exiting loop", { sessionId })
      break;
    }

    const assistantMessage = await messageService.createAssistantMessage({ sessionId })
    const processor = Processor.create({ sessionId, assistantMessage })

    let nextAction = await processor.process({
      sessionId,
      messages: messageService.toModelMessages(sessionMessages),
      model: getModel(),
      system: SYSTEM,
      tools: {},
    })

    if (nextAction === NextAction.STOP) break;
    if (nextAction === NextAction.COMPACT) {
      console.info("compacting session", { sessionId })
      // TODO: 触发会话压缩
    };
    continue;
  }
})
