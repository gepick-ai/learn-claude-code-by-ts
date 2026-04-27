import { Hono } from "hono"
import { sessionService } from "./service"

const sessionController = new Hono()

sessionController.post("/", async (c) => {
  const sessionID = await sessionService.createSession()
  return c.json({ sessionId: sessionID })
})

sessionController.get("/:sessionID", async (c) => {
  const sessionID = c.req.param("sessionID")
  const messages = await sessionService.getSessionMessages(sessionID)
  if (!messages) {
    return c.json({ error: "Session not found" }, 404)
  }
  return c.json({ messages })
})

sessionController.post("/:sessionID/message", async (c) => {
  try {
    const sessionID = c.req.param("sessionID")
    const { message } = await c.req.json()
    if (!message) {
      return c.json({ error: "message is required" }, 400)
    }

    const result = await sessionService.chatWithSession(sessionID, message)
    return c.json({
      success: true,
      response: result.response,
      messages: result.messages,
    })
  } catch (error) {
    console.error("Chat error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

export default sessionController
