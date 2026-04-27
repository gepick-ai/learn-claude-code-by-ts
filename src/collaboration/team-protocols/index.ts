import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { auth, build, model } from "../../common/main";
import { type WrappedFn } from "../../common/util/fn";
import { createTracer } from "../../common/util/trace";
import { Bash, bash, EditFile, editFile, ReadFile, readFile, WriteFile, writeFile } from "../../common/tools/fs";


const tracer = createTracer("agent-team");

const TOOL_HANDLERS = new Map<string, WrappedFn<z.ZodTypeAny, Promise<string>>>([
    ["bash", bash],
    ["read_file", readFile],
    ["write_file", writeFile],
    ["edit_file", editFile],
]);

const AUTH = auth()
const MODEL = model();
const SYSTEM = `You are a team lead at ${import.meta.dirname}. Manage members with shutdown and plan approval protocols.`;
const TOOLS: Anthropic.Tool[] = [
    Bash,
    ReadFile,
    WriteFile,
    EditFile,
];

const messages: Anthropic.MessageParam[] = [];

async function loop(prompt: string): Promise<Anthropic.MessageParam[]> {
    messages.push({
        role: "user",
        content: prompt,
    });

    while (true) {
        const response = await AUTH.messages.create({
            model: MODEL,
            system: SYSTEM,
            messages,
            tools: TOOLS,
            max_tokens: 8000,
        });

        messages.push({
            role: "assistant",
            content: response.content,
        });

        if (response.stop_reason !== "tool_use") {
            break;
        }

        const results: Array<Anthropic.TextBlockParam | Anthropic.ToolResultBlockParam> = [];
        for (const block of response.content) {
            if (block.type === "tool_use") {
                let output = '';
                const handler = TOOL_HANDLERS.get(block.name);

                if (!handler) {
                    output = `Unknown tool: ${block.name}`;
                } else {
                    try {
                        output = await handler(block.input);
                    } catch (err) {
                        output = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
                    }
                }

                results.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: output,
                });
            }
        }

        messages.push({
            role: "user",
            content: results,
        });
    }

    return messages;
}

build(loop).run({
    label: "协作 >> 团队协议",
    model: MODEL,
    system: SYSTEM,
})