import { getModel } from "./model"
import { agentTools } from "./tools"
import type { ModelMessage } from "ai"
import z from "zod"
import { Processor } from "./processor"
import { fn } from "../util/fn"
import { messageService, sessionService } from "../server/session/service"

export const MODEL = getModel()
export const SYSTEM =
  "You are a coding agent. Use the available tools to solve tasks. Act, don't explain."
export const TOOLS = agentTools

const LoopInput = z.object({
  sessionId: z.string(),
})

export const loop = fn(LoopInput, async ({ sessionId }): Promise<ModelMessage[]> => {
  while (true) {
    // 获取会话消息列表
    const messages = await messageService.getMessages({ sessionId })
    const assistantMessage = await messageService.createAssistantMessage({ sessionId })

    const processor = Processor.create({
      sessionId,
      assistantMessage,
    })

    const nextStatus = await processor.process({ 
      sessionId, 
      messages: messageService.toModelMessages(messages),
      model: MODEL,
      system: SYSTEM,
      tools: TOOLS,
    })
    
    if (nextStatus === "stop") break;
    if (nextStatus === "continue") continue
  }

  throw new Error("Impossible")
})
