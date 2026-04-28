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


export const PartBase = z.object({
  id: z.string(),
  sessionId: z.string(),
  messageId: z.string(),
})
export type PartBase = z.infer<typeof PartBase>

// #region Reasoning Part
export const ReasoningPart = PartBase.extend({
  type: z.literal("reasoning"),
  text: z.string(),
}).meta({
  ref: "ReasoningPart",
})
export type ReasoningPart = z.infer<typeof ReasoningPart>
// #endregion Reasoning Part

// #region Text Part
export const TextPart = PartBase.extend({
  type: z.literal("text"),
  text: z.string(),
  synthetic: z.boolean().optional(),
  ignored: z.boolean().optional(),
}).meta({
  ref: "TextPart",
})
export type TextPart = z.infer<typeof TextPart>
// #endregion Text Part


// #region Tool Part
export const ToolPending = z.object({
  status: z.literal("pending"),
  input: z.record(z.string(), z.any()),
}).meta({ ref: "ToolPending" })
export type ToolPending = z.infer<typeof ToolPending>

export const ToolRunning = z.object({
  status: z.literal("running"),
  input: z.record(z.string(), z.any()),
}).meta({ ref: "ToolRunning" })
export type ToolRunning = z.infer<typeof ToolRunning>

export const ToolCompleted = z.object({
  status: z.literal("completed"),
  input: z.record(z.string(), z.any()),
  output: z.string(),
}).meta({ ref: "ToolCompleted" })
export type ToolCompleted = z.infer<typeof ToolCompleted>

export const ToolError = z.object({
  status: z.literal("error"),
  input: z.record(z.string(), z.any()),
  error: z.string(),
}).meta({ ref: "ToolError" })
export type ToolError = z.infer<typeof ToolError>

export const ToolState = z.discriminatedUnion("status", [ToolPending, ToolRunning, ToolCompleted, ToolError]).meta({ ref: "ToolState" })

export const ToolPart = PartBase.extend({
  type: z.literal("tool"),
  callId: z.string(),
  tool: z.string(),
  state: ToolState,
  metadata: z.record(z.string(), z.unknown()).optional(),
}).meta({
  ref: "ToolPart",
})
export type ToolPart = z.infer<typeof ToolPart>
// #endregion Tool Part


export const Part = z.discriminatedUnion("type", [ReasoningPart, TextPart, ToolPart]).meta({
  ref: "Part",
})
export type Part = z.infer<typeof Part>

export const SessionMessage = z.object({
  message: Message,
  parts: z.array(Part),
}).meta({
  ref: "SessionMessage",
})
export type SessionMessage = z.infer<typeof SessionMessage>