import z from "zod"
import { NamedError } from "@gepick/core"

export const NotFoundError = NamedError.create(
  "NotFoundError",
  z.object({
    message: z.string(),
  }),
)
