import { z } from "zod"

export type WrappedFn<T extends z.ZodTypeAny, Result> = {
  (input: unknown): Result
  force: (input: z.infer<T>) => Result
  schema: T
}

export function fn<T extends z.ZodTypeAny, Result>(
  schema: T,
  cb: (input: z.infer<T>) => Result,
): WrappedFn<T, Result> {
  const result = ((input: unknown) => {
    try {
      const parsed = schema.parse(input)
      return cb(parsed)
    } catch (e) {
      console.trace("schema validation failure stack trace:")
      throw e
    }
  }) as WrappedFn<T, Result>

  result.force = (input: z.infer<T>) => cb(input)
  result.schema = schema

  return result
}
