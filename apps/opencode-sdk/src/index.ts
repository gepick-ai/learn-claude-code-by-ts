export * from "./client.js"

import { createOpencodeClient } from "./client.js"

export function createOpencode(...args: Parameters<typeof createOpencodeClient>) {
  const client = createOpencodeClient(...args)
  return {
    client,
  }
}
