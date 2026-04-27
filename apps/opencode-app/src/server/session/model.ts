import z from "zod"

// #region Session
export const Session = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
}).meta({
  ref: "Session",
})
export type Session = z.infer<typeof Session>

// #endregion Session


  // #region Message
  export const MessageBase = z.object({
    id: z.string(),
    sessionId: z.string(),
    createdAt: z.number(),
  })
  export type MessageBase = z.infer<typeof MessageBase>

  export const UserMessage = MessageBase.extend({
    role: z.literal("user"),
  }).meta({
    ref: "UserMessage",
  })
  export type UserMessage = z.infer<typeof UserMessage>

  export const AssistantMessage = MessageBase.extend({
    role: z.literal("assistant"),
    finish: z.string().optional(),
    error: z.string().optional(),
  }).meta({
    ref: "AssistantMessage",
  })
  export type AssistantMessage = z.infer<typeof AssistantMessage>

  export const Message = z.discriminatedUnion("role", [UserMessage, AssistantMessage]).meta({
    ref: "Message",
  })
  export type Message = z.infer<typeof Message>
  // #endregion Message



  // #region Parts
  export const PartBase = z.object({
    id: z.string(),
    sessionId: z.string(),
    messageId: z.string(),
  })
  export type PartBase = z.infer<typeof PartBase>

  export const ReasoningPart = PartBase.extend({
    type: z.literal("reasoning"),
    text: z.string(),
  }).meta({
    ref: "ReasoningPart",
  })
  export type ReasoningPart = z.infer<typeof ReasoningPart>

  export const TextPart = PartBase.extend({
    type: z.literal("text"),
    text: z.string(),
    synthetic: z.boolean().optional(),
    ignored: z.boolean().optional(),
  }).meta({
    ref: "TextPart",
  })
  export type TextPart = z.infer<typeof TextPart>

  export const ToolPart = PartBase.extend({
    type: z.literal("tool"),
    tool: z.string(),
    callId: z.string(),
    input: z.record(z.string(), z.unknown()).optional(),
    output: z.string().optional(),
    error: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).meta({
    ref: "ToolPart",
  })
  export type ToolPart = z.infer<typeof ToolPart>

  export const Part = z.discriminatedUnion("type", [ReasoningPart, TextPart, ToolPart]).meta({
    ref: "Part",
  })
  export type Part = z.infer<typeof Part>
  // #endregion Parts

  export const SessionMessage = z.object({
    message: Message,
    parts: z.array(Part),
  }).meta({
    ref: "SessionMessage",
  })
  export type SessionMessage = z.infer<typeof SessionMessage>