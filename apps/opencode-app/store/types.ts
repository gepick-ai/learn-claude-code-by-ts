import type { SessionMessages } from "../agent/types";

export interface SessionStore {
  createSession(): string | Promise<string>;
  getSession(
    sessionId: string
  ): SessionMessages | undefined | Promise<SessionMessages | undefined>;
  saveSession(
    sessionId: string,
    messages: SessionMessages
  ): void | Promise<void>;
}
