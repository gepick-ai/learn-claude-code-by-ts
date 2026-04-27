import path from "node:path";
import { mkdir } from "node:fs/promises";
import type Anthropic from "@anthropic-ai/sdk";
import { fn } from "../../common/util/fn";
import { createTracer } from "../../common/util/trace";
import z from "zod";
import { authAnthropic, model } from "../../common/main";



const THRESHOLD = 50000;
const TRANSCRIPT_DIR = path.join(import.meta.dir, "transcripts");
const KEEP_RECENT = 3;
const tracer = createTracer("compact");

const Compact = {
    name: "compact",
    description: "Trigger manual conversation compression.",
    input_schema: {
        type: "object",
        properties: {
            focus: {
                type: "string",
                description: "What to preserve in the summary",
            },
        },
    },
} satisfies Anthropic.Tool;
/**
 * 粗略估算 token 数量：按每 4 个字符约等于 1 个 token 计算。
 */
function estimateTokens(messages: unknown): number {
    return Math.floor(JSON.stringify(messages).length / 4);
}

/**
 * 第一层微压缩：把较早的 tool_result 内容替换成简短占位符，只保留最近若干条完整结果。
 */
function microCompact(
    messages: Anthropic.MessageParam[],
    keepRecent = KEEP_RECENT,
): Anthropic.MessageParam[] {
    const toolResults: Array<{
        msgIndex: number;
        partIndex: number;
        part: Anthropic.ToolResultBlockParam;
    }> = [];

    for (const [msgIndex, message] of messages.entries()) {
        if (message.role !== "user" || !Array.isArray(message.content)) {
            continue;
        }

        for (const [partIndex, part] of message.content.entries()) {
            if (
                typeof part === "object"
                && part !== null
                && "type" in part
                && part.type === "tool_result"
            ) {
                toolResults.push({
                    msgIndex,
                    partIndex,
                    part,
                });
            }
        }
    }

    if (toolResults.length <= keepRecent) {
        return messages;
    }

    const toolNameMap = new Map<string, string>();

    for (const message of messages) {
        if (message.role !== "assistant" || !Array.isArray(message.content)) {
            continue;
        }

        for (const block of message.content) {
            if (block.type === "tool_use") {
                toolNameMap.set(block.id, block.name);
            }
        }
    }

    const toClear = toolResults.slice(0, -keepRecent);
    let replacedCount = 0;

    for (const { part } of toClear) {
        const content = part.content;

        if (typeof content === "string" && content.length > 100) {
            const toolId = typeof part.tool_use_id === "string" ? part.tool_use_id : "";
            const toolName = toolNameMap.get(toolId) ?? "unknown";
            part.content = `[Previous: used ${toolName}]`;
            replacedCount += 1;
        }
    }

    if (replacedCount > 0) {
        tracer.log(
            "micro_compact",
            `replaced ${replacedCount} old tool_result(s), kept recent ${keepRecent}`,
        );
    }

    return messages;
}

/**
 * 第二层自动压缩：保存完整 transcript，调用模型生成摘要，再用摘要替换全部历史消息。
 */
const AUTH = authAnthropic()
const MODEL = model()
async function autoCompact(
    messages: Anthropic.MessageParam[],
): Promise<Anthropic.MessageParam[]> {
    const beforeTokens = estimateTokens(messages);
    tracer.log(
        "auto_compact_start",
        `messages=${messages.length}, est_tokens=${beforeTokens}`,
    );

    await mkdir(TRANSCRIPT_DIR, { recursive: true });

    const transcriptPath = path.join(
        TRANSCRIPT_DIR,
        `transcript_${Math.floor(Date.now() / 1000)}.jsonl`,
    );

    const transcript = messages
        .map((message) => JSON.stringify(message, null, 0))
        .join("\n");

    await Bun.write(transcriptPath, `${transcript}\n`);
    tracer.log("transcript_saved", transcriptPath);

    const conversationText = JSON.stringify(messages).slice(0, 80000);
    const response = await AUTH.messages.create({
        model: MODEL,
        messages: [
            {
                role: "user",
                content:
                    "Summarize this conversation for continuity. Include: "
                    + "1) What was accomplished, 2) Current state, 3) Key decisions made. "
                    + "Be concise but preserve critical details.\n\n"
                    + conversationText,
            },
        ],
        max_tokens: 2000,
    });

    const summary = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
    const compactedMessages: Anthropic.MessageParam[] = [
        {
            role: "user",
            content: `[Conversation compressed. Transcript: ${transcriptPath}]\n\n${summary}`,
        },
        {
            role: "assistant",
            content: "Understood. I have the context from the summary. Continuing.",
        },
    ];

    tracer.log(
        "auto_compact_done",
        `est_tokens ${beforeTokens} -> ${estimateTokens(compactedMessages)}, summary_chars=${summary.length}`,
    );

    return compactedMessages;
}

const CompactInputSchema = z.object({
    focus: z.string().optional(),
});
const compact = fn(CompactInputSchema, async () => "Manual compression requested.");

export {
    Compact,
    compact,
    KEEP_RECENT,
    THRESHOLD,
    TRANSCRIPT_DIR,
    autoCompact,
    estimateTokens,
    microCompact,
};