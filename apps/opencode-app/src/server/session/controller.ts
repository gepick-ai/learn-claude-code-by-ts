import { Hono } from "hono"
import { stream } from "hono/streaming"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { messageService, PromptInput, sessionService } from "./service"
import { errors } from "../error"
import { SessionMessage } from "./model"

const sessionController = new Hono()

sessionController
.post(
  "/",
  describeRoute({
    summary: "Create session",
    description: "Create a new chat session.",
    operationId: "session.create",
    responses: {
      200: {
        description: "Created session",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                sessionId: z.string(),
                session: z.object({
                  id: z.string(),
                  name: z.string(),
                  createdAt: z.string(),
                }),
              }),
            ),
          },
        },
      },
    },
  }),
  async (c) => {
    const session = await sessionService.createSession()
    return c.json({ sessionId: session.id, session })
  },
)
.get(
  "/:sessionId",
  describeRoute({
    summary: "Get session messages",
    description: "Get all messages of a session by ID.",
    operationId: "session.getMessages",
    responses: {
      200: {
        description: "Session messages",
        content: {
          "application/json": {
            schema: resolver(z.object({ messages: z.array(z.any()) })),
          },
        },
      },
      ...errors(400, 404),
    },
  }),
  validator("param", z.object({ sessionId: z.string() })),
  async (c) => {
    const sessionId = c.req.valid("param").sessionId
    const session = await sessionService.getSession(sessionId)
    return c.json(session)
  },
)
.post(
  "/:sessionId/message",
  describeRoute({
    summary: "Send message",
    description: "Create and send a new message to a session, streaming the AI response.",
    operationId: "session.prompt",
    responses: {
      200: {
        description: "Created message",
        content: {
          "application/json": {
            schema: resolver(z.object({ success: z.boolean() })),
          },
        },
      },
      ...errors(400, 404),
    },
  }),
  validator("param", z.object({ sessionId: z.string() })),
  validator("json", PromptInput.omit({ sessionId: true })),
  async (c) => {
    const sessionId = c.req.valid("param").sessionId
    const body = c.req.valid("json")
    c.status(200)
    c.header("Content-Type", "application/json")
    return stream(c, async (s) => {
      await messageService.prompt({
        sessionId,
        parts: body.parts,
      })
      s.write(
        JSON.stringify({ success: true }),
      )
    })
  },
)
.get( "/:sessionId/message",
  describeRoute({
    summary: "Get session messages",
    description: "Retrieve all messages in a session, including user prompts and AI responses.",
    operationId: "session.messages",
    responses: {
      200: {
        description: "List of messages",
        content: {
          "application/json": {
            schema: resolver(SessionMessage.array()),
          },
        },
      },
      ...errors(400, 404),
    },
  }),
  validator(
    "param",
    z.object({
      sessionId: z.string().meta({ description: "Session Id" }),
    }),
  ),
  validator(
    "query",
    z.object({
      limit: z.coerce.number().optional(),
    }),
  ),
  async(c) => {
    const query = c.req.valid("query")

    const messages = await messageService.getMessages({
      sessionId: c.req.valid("param").sessionId,
      limit: query.limit,
    })

    return c.json(messages)
  }
)

export default sessionController
