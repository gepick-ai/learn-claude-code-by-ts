import {
  streamText,
  type LanguageModel,
  type ModelMessage,
  type StreamTextResult,
  type ToolSet,
  type Tool
} from "ai"

export type StreamInput = {
  sessionId: string
  model: LanguageModel
  system: string
  messages: ModelMessage[]
  tools:  Record<string, Tool>
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
      maxRetries:0,
      onError: (err) => {
        console.error(err);
      }
    })
  }
}
