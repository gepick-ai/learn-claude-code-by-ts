import Anthropic from "@anthropic-ai/sdk";
import { build, authAnthropic, model } from "../../common/main";
import { bash, Bash, EditFile, editFile, ReadFile, readFile, WriteFile, writeFile } from "../../common/tools/fs";
import type { WrappedFn } from "../../common/util/fn";
import type z from "zod";

const TOOL_HANDLERS = new Map<string, WrappedFn<z.ZodTypeAny, Promise<string>>>([
    ["bash", bash],
    ["read_file", readFile],
    ["write_file", writeFile],
    ["edit_file", editFile],
]);

const AUTH = authAnthropic();
const MODEL = model();
const SYSTEM = `You are a coding agent at ${process.cwd()}. Use bash to solve tasks. Act, don't explain.`;
const TOOLS: Anthropic.Tool[] = [
    Bash,
    ReadFile,
    WriteFile,
    EditFile,
];

async function loop(prompt: string): Promise<Anthropic.MessageParam[]> {
    const messages: Anthropic.MessageParam[] = [];

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

        const results: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
            if (block.type === "tool_use") {
                let output = '';
                const handler = TOOL_HANDLERS.get(block.name);
                if (!handler) {
                    output = `Unknown tool: ${block.name}`;
                } else {
                    try {
                        output = await handler(block.input);
                    } catch (error) {
                        output = `Error: ${error}`;
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
    label: "工具与执行 >> Tools",
    model: MODEL,
    system: SYSTEM,
});