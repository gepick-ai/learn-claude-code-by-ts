import { MemorySessionStore } from "./memory";
import { PostgresSessionStore } from "./postgres";
import type { SessionStore } from "./types";

let store: SessionStore | null = null;

export function getSessionStore(): SessionStore {
  if (!store) {
    if (process.env.USE_POSTGRES === "true") {
      store = new PostgresSessionStore();
      console.log("📦 Using PostgreSQL session store");
    } else {
      store = new MemorySessionStore();
      console.log("💾 Using in-memory session store");
    }
  }

  return store;
}

export type { SessionStore } from "./types";
