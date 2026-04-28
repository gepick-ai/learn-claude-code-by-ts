import { getModel } from "./model"
import { agentTools } from "./tools"
import type { ModelMessage } from "ai"
import z from "zod"
import { Processor } from "./processor"
import { fn } from "../util/fn"
import { messageService, sessionService } from "../server/session/service"
import type { AssistantMessage, UserMessage } from "../server/session/model"

export const MODEL = getModel()
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
    let lastUserMessage: UserMessage | undefined;
    let lastAssistantMessage: AssistantMessage | undefined;
    let lastFinishedAssistantMessage: AssistantMessage | undefined;

    for (let i = sessionMessages.length - 1; i >= 0; i--) {
      const sessionMessage = sessionMessages[i]!;
     
      if(sessionMessage.message.role === "user"){
         // 找到最后一个用户消息
        if(!lastUserMessage) lastUserMessage = sessionMessage.message;
      }
     
      if(sessionMessage.message.role === "assistant"){
         // 找到最后一个助手消息
        if(!lastAssistantMessage) lastAssistantMessage = sessionMessage.message;
        // 找到最后一个完成状态的助手消息
        if(!lastFinishedAssistantMessage && sessionMessage.message.finish) lastFinishedAssistantMessage = sessionMessage.message;
      }

      // 如果找到最后一个用户消息和最后一个完成状态的助手消息，则退出循环
      if(lastUserMessage && lastFinishedAssistantMessage) break;
    }

    if (!lastUserMessage) throw new Error("No user message found in stream. This should never happen.")
    // 如果最后一个助手消息是完成状态且不是tool-calls或unknown，则退出循环。即认为模型已经完成任务。
    if(lastAssistantMessage?.finish && !["tool-calls", "unknown"].includes(lastAssistantMessage.finish) && lastUserMessage.id < lastAssistantMessage.id) {
      console.info("exiting loop", { sessionId })
      break;
    }

    const assistantMessage = await messageService.createAssistantMessage({ sessionId })
    const processor = Processor.create({
      sessionId,
      assistantMessage,
    })

    const nextStatus = await processor.process({
      sessionId,
      messages: messageService.toModelMessages(sessionMessages),
      model: MODEL,
      system: SYSTEM,
      tools: TOOLS,
    })

    if (nextStatus === "stop") break;
    continue
  }
})
