import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sessions } from "./schema";
import type { SessionStore } from "./types";

export class PostgresSessionStore implements SessionStore {
  private db: ReturnType<typeof drizzle>;
  private pool: Pool;

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
    });
    this.db = drizzle(this.pool);
    this.initTable();
  }

  private async initTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        messages JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  async createSession(): Promise<string> {
    const sessionId = crypto.randomUUID();
    await this.db.insert(sessions).values({
      id: sessionId,
      messages: [],
    });
    return sessionId;
  }

  async getSession(sessionId: string): Promise<Anthropic.MessageParam[] | undefined> {
    const result = await this.db
      .select({ messages: sessions.messages })
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    const session = result[0];
    if (!session) {
      return undefined;
    }
    return session.messages as Anthropic.MessageParam[];
  }

  async saveSession(sessionId: string, messages: Anthropic.MessageParam[]): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        messages: messages as unknown[],
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));
  }

  async close() {
    await this.pool.end();
  }
}
