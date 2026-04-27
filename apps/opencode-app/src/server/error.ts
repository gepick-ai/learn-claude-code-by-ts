import { resolver } from "hono-openapi"
import z from "zod"

const ErrorOutput = z.object({
  error: z.string(),
})

export const ERRORS = {
  400: {
    description: "Bad request",
    content: {
      "application/json": {
        schema: resolver(ErrorOutput),
      },
    },
  },
  404: {
    description: "Not found",
    content: {
      "application/json": {
        schema: resolver(ErrorOutput),
      },
    },
  },
} as const

export function errors(...codes: number[]) {
  return Object.fromEntries(codes.map((code) => [code, ERRORS[code as keyof typeof ERRORS]]))
}
