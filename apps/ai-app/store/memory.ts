import type { SessionMessages } from "../agent/types";
import type { SessionStore } from "./types";

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, SessionMessages>();

  createSession(): string {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, []);
    return sessionId;
  }

  getSession(sessionId: string): SessionMessages | undefined {
    return this.sessions.get(sessionId);
  }

  saveSession(sessionId: string, messages: SessionMessages): void {
    this.sessions.set(sessionId, messages);
  }
}
