import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import { describeRoute, resolver } from "hono-openapi"
import z from "zod"
import { Bus } from "../../util/bus"

const sseController = new Hono()

const EventPayload = z.object({
  type: z.string(),
  properties: z.record(z.string(), z.unknown()),
})

sseController.get(
  "/event",
  describeRoute({
    summary: "Subscribe to events",
    description: "Subscribe to server events over SSE.",
    operationId: "event.subscribe",
    responses: {
      200: {
        description: "Event stream",
        content: {
          "text/event-stream": {
            schema: resolver(EventPayload),
          },
        },
      },
    },
  }),
  async (c) => {
    c.header("X-Accel-Buffering", "no")
    c.header("X-Content-Type-Options", "nosniff")
    return streamSSE(c, async (stream) => {
      await stream.writeSSE({
        data: JSON.stringify({
          type: "server.connected",
          properties: {},
        }),
      })
      const unsub = Bus.subscribeAll(async (event) => {
        await stream.writeSSE({
          data: JSON.stringify(event),
        })
      })
      const heartbeat = setInterval(() => {
        void stream.writeSSE({
          data: JSON.stringify({
            type: "server.heartbeat",
            properties: {},
          }),
        })
      }, 10_000)

      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          clearInterval(heartbeat)
          unsub()
          resolve()
        })
      })
    })
  },
)

export default sseController
