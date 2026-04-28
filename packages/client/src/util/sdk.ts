import { createOpencodeClient } from "@gepick/sdk"
import { apiBase } from "./api-base"

export const sdk = createOpencodeClient({
  baseUrl: apiBase() || undefined,
  responseStyle: "data",
  throwOnError: true,
})
