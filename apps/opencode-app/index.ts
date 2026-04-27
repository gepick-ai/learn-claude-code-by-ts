import { Hono } from "hono"
import { cors } from "hono/cors"
import { streamSSE } from "hono/streaming"
import sessionController from "./server/session/controller"
import { MiniBus } from "./server/bus"

const app = new Hono()
app.use(cors())

app.get("/event", async (c) => {
  c.header("X-Accel-Buffering", "no")
  c.header("X-Content-Type-Options", "nosniff")
  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      data: JSON.stringify({
        type: "server.connected",
        properties: {},
      }),
    })
    const unsub = MiniBus.subscribeAll(async (event) => {
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
})

app.route("/session", sessionController)
app.route("/api/session", sessionController)

const htmlPath = new URL("./server/frontend.html", import.meta.url)
app.get("/", async (c) => {
  return c.html(await Bun.file(htmlPath).text())
})

console.log("🚀 AI SDK server starting on http://localhost:3000")

export default {
  port: 3000,
  fetch: app.fetch,
}
