import Anthropic from "@anthropic-ai/sdk";

export interface SessionStore {
  createSession(): string | Promise<string>;
  getSession(
    sessionId: string
  ):
    | Anthropic.MessageParam[]
    | undefined
    | Promise<Anthropic.MessageParam[] | undefined>;
  saveSession(
    sessionId: string,
    messages: Anthropic.MessageParam[]
  ): void | Promise<void>;
}
