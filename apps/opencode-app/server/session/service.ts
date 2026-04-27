import { agentLoop } from "../../agent/core"
import { getSessionStore } from "../../store"
import { MiniBus } from "../bus"

export class SessionService {
  private readonly sessionStore = getSessionStore()

  async createSession() {
    return await this.sessionStore.createSession()
  }

  async getSessionMessages(sessionID: string) {
    return await this.sessionStore.getSession(sessionID)
  }

  async chatWithSession(sessionID: string, message: string) {
    const pub = MiniBus.publish.bind(MiniBus)
    pub({
      type: "session.status",
      properties: { sessionID, status: "busy" },
    })
    try {
      let messages = (await this.sessionStore.getSession(sessionID)) || []
      messages = await agentLoop(message, messages, {
        sessionID,
        publish: pub,
      })
      await this.sessionStore.saveSession(sessionID, messages)

      const lastMessage = messages[messages.length - 1]
      const textBlocks: string[] = []
      if (Array.isArray(lastMessage?.content)) {
        for (const block of lastMessage.content) {
          if ("text" in block) {
            textBlocks.push(block.text)
          }
        }
      }

      return {
        response: textBlocks.join("\n\n") || "(no response)",
        messages,
      }
    } catch (e) {
      pub({
        type: "session.error",
        properties: {
          sessionID,
          message: e instanceof Error ? e.message : String(e),
        },
      })
      throw e
    } finally {
      pub({
        type: "session.status",
        properties: { sessionID, status: "idle" },
      })
    }
  }
}

export const sessionService = new SessionService()
