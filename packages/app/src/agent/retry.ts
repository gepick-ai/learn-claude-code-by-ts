import type { NamedError } from "@gepick/core";
import { LLM } from "./llm";

export namespace SessionRetry {
    export function checkRetryable(error: ReturnType<NamedError["toObject"]>) {
        const retryable = (isRetryable: boolean, reason: string) => ({ isRetryable, reason });

        if (LLM.ContextOverflowError.is(error)) {
            return retryable(false, "Context overflow not retryable");
        }
        if (LLM.APIError.is(error)) {
            if (!error.data.isRetryable) return retryable(false, "API error not retryable");
            return retryable(true, error.data.message.includes("Overloaded") ? "Provider is overloaded" : error.data.message)
        }


        const json = (() => {
            try {
                return JSON.parse(error.data.message)
            } catch (e: any) {
                return e.message
            }
        })()

        try {
            if (!json || typeof json !== 'object') {
                return retryable(false, "Invalid JSON not retryable");
            }

            if (json.type === "error" && json.error?.type === "too_many_requests") {
                return retryable(true, "Too many requests");
            }

            const code = typeof json.code === "string" ? json.code : ""

            if (code.includes("exhausted") || code.includes("unavailable")) {
                return retryable(true, "Provider is overloaded");
            }

            if (json.type === "error" && json.error?.code?.includes("rate_limit")) {
                return retryable(true, "Rate Limited");
            }

            return retryable(true, JSON.stringify(json));
        } catch {
            return retryable(false, "Unknown error not retryable");
        }
    }
}