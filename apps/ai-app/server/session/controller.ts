import { Hono } from "hono";
import { sessionService } from "./service";

const sessionController = new Hono();

sessionController.post("/", async (c) => {
  const sessionId = await sessionService.createSession();
  return c.json({ sessionId });
});

sessionController.get("/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const messages = await sessionService.getSessionMessages(sessionId);
  if (!messages) {
    return c.json({ error: "Session not found" }, 404);
  }
  return c.json({ messages });
});

sessionController.post("/:sessionId/message", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const { message } = await c.req.json();
    if (!message) {
      return c.json({ error: "message is required" }, 400);
    }

    const result = await sessionService.chatWithSession(sessionId, message);
    return c.json({
      success: true,
      response: result.response,
      messages: result.messages,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default sessionController;
