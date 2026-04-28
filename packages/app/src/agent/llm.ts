import { NamedError, UnknownError } from "@gepick/core"
import z from "zod"
import {
  streamText,
  type LanguageModel,
  type ModelMessage,
  type StreamTextResult,
  type ToolSet,
  type Tool,
  LoadAPIKeyError,
  APICallError,
} from "ai"
import type { SystemError } from "bun"

export type StreamInput = {
  sessionId: string
  model: LanguageModel
  system: string
  messages: ModelMessage[]
  tools: Record<string, Tool>
  abortSignal?: AbortSignal
}

export type StreamOutput = StreamTextResult<ToolSet, unknown>

/** 对齐 opencode `session/llm`：对 `streamText` 的薄封装，集中默认参数与扩展点。 */
export namespace LLM {
  const DEFAULT_MAX_OUT = 8000

  export function stream(input: StreamInput): StreamOutput {
    const model = input.model;
    const system = input.system;
    const messages = input.messages;
    const tools = input.tools;
    const maxOutputTokens = DEFAULT_MAX_OUT;
    const abortSignal = input.abortSignal;

    return streamText({
      model,
      system,
      messages,
      tools,
      maxOutputTokens,
      abortSignal,
      maxRetries: 0,
      onError: (err) => {
        console.error(err);
      }
    })
  }

  export const OutputLengthError = NamedError.create("MessageOutputLengthError", z.object({}))
  export const AbortedError = NamedError.create("MessageAbortedError", z.object({ message: z.string() }))
  export const StructuredOutputError = NamedError.create("StructuredOutputError",
    z.object({
      message: z.string(),
      retries: z.number(),
    }),
  )
  export const AuthError = NamedError.create("ProviderAuthError",
    z.object({
      // providerID: z.string(),
      message: z.string(),
    }),
  )
  export const APIError = NamedError.create("APIError",
    z.object({
      message: z.string(),
      statusCode: z.number().optional(),
      isRetryable: z.boolean(),
      responseHeaders: z.record(z.string(), z.string()).optional(),
      responseBody: z.string().optional(),
      metadata: z.record(z.string(), z.string()).optional(),
    }),
  )
  export type APIError = z.infer<typeof APIError.Schema>
  export const ContextOverflowError = NamedError.create(
    "ContextOverflowError",
    z.object({ message: z.string(), responseBody: z.string().optional() }),
  )

  export function fromError(e: unknown) {
    switch (true) {
      case e instanceof DOMException && e.name === "AbortError": {
        return new AbortedError({ message: e.message }, { cause: e }).toObject()
      }
      case OutputLengthError.is(e): {
        return e instanceof OutputLengthError ? e.toObject() : e;
      }
      case LoadAPIKeyError.isInstance(e): {
        return new AuthError({ message: e.message }, { cause: e }).toObject()
      }
      case (e as SystemError)?.code === 'ECONNRESET': {
        return new APIError({
          message: "Connection reset by server",
          isRetryable: true,
        }, { cause: e }).toObject()
      }
      case APICallError.isInstance(e): {
        return new APIError({
          message: e.message,
          isRetryable: e.isRetryable,
          statusCode: e.statusCode,
          responseHeaders: e.responseHeaders,
          responseBody: e.responseBody,
        }, { cause: e }).toObject()
      }
      case e instanceof Error: {
        return new UnknownError({ message: e.toString() }, { cause: e }).toObject()
      }
      default: {
        return new UnknownError({ message: JSON.stringify(e)}, { cause: e }).toObject()
      }
    }
  }
}
