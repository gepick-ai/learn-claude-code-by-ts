import { createAnthropic } from "@ai-sdk/anthropic";

const apiKey = process.env.ANTHROPIC_API_KEY;
const rawBaseURL = process.env.ANTHROPIC_BASE_URL;
const baseURL =
  rawBaseURL && !rawBaseURL.endsWith("/v1") ? `${rawBaseURL}/v1` : rawBaseURL;

const provider = createAnthropic({
  apiKey,
  baseURL,
  headers: apiKey
    ? {
        Authorization: `Bearer ${apiKey}`,
      }
    : undefined,
});

export function getModel() {
  const modelId = process.env.MODEL_ID ?? process.env.OPENAI_MODEL;

  if (!modelId) {
    throw new Error("MODEL_ID or OPENAI_MODEL is required");
  }

  return provider(modelId);
}
