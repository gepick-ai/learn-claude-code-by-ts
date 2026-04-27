import Anthropic from "@anthropic-ai/sdk";
import type { SessionStore } from "./types";

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, Anthropic.MessageParam[]>();

  createSession(): string {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, []);
    return sessionId;
  }

  getSession(sessionId: string): Anthropic.MessageParam[] | undefined {
    return this.sessions.get(sessionId);
  }

  saveSession(sessionId: string, messages: Anthropic.MessageParam[]): void {
    this.sessions.set(sessionId, messages);
  }
}
