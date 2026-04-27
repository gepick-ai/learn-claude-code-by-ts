import { agentLoop } from "../../agent/core";
import { getSessionStore } from "../../store";

export class SessionService {
  private readonly sessionStore = getSessionStore();

  async createSession() {
    return await this.sessionStore.createSession();
  }

  async getSessionMessages(sessionId: string) {
    return await this.sessionStore.getSession(sessionId);
  }

  async chatWithSession(sessionId: string, message: string) {
    let messages = (await this.sessionStore.getSession(sessionId)) || [];
    messages = await agentLoop(message, messages);
    await this.sessionStore.saveSession(sessionId, messages);

    const lastMessage = messages[messages.length - 1];
    const textBlocks: string[] = [];
    if (Array.isArray(lastMessage?.content)) {
      for (const block of lastMessage.content) {
        if ("text" in block) {
          textBlocks.push(block.text);
        }
      }
    }

    return {
      response: textBlocks.join("\n\n") || "(no response)",
      messages,
    };
  }
}

export const sessionService = new SessionService();
