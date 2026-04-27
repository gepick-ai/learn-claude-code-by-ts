import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { type WrappedFn } from "../../common/util/fn";
import { Bash, bash, EditFile, editFile, ReadFile, readFile, WriteFile, writeFile } from "../../common/tools/fs";
import { authAnthropic, build, model } from "../../common/main";
import { Todo, todo } from "./tools";
import { createTracer } from "../../common/util/trace";

const TOOL_HANDLERS = new Map<string, WrappedFn<z.ZodTypeAny, Promise<string>>>([
    ["bash", bash],
    ["read_file", readFile],
    ["write_file", writeFile],
    ["edit_file", editFile],
    ["todo", todo],
]);

const AUTH = authAnthropic()
const MODEL = model();
const SYSTEM = `You are a coding agent at ${import.meta.dir}.
Use the todo tool to plan multi-step tasks. Mark in_progress before starting, completed when done.
Prefer tools over prose.`;
const TOOLS: Anthropic.Tool[] = [
    Bash,
    ReadFile,
    WriteFile,
    EditFile,   
    Todo,
];

async function loop(prompt: string): Promise<Anthropic.MessageParam[]> {
    const messages:Anthropic.MessageParam[] = [];

    messages.push({
        role: "user",
        content: prompt,
    });

    const tracer = createTracer("parent");
    tracer.log("start");

    let rounds_since_todo = 0;
    while (true) {
        const response = await AUTH.messages.create({
            model: MODEL,
            system: SYSTEM,
            messages,
            tools: TOOLS,
            max_tokens: 8000,
        });

        tracer.log("stop_reason", String(response.stop_reason));

        messages.push({
            role: "assistant",
            content: response.content,
        });

        if (response.stop_reason !== "tool_use") {
            break;
        }

        let used_todo = false;

        const results: Array<Anthropic.TextBlockParam | Anthropic.ToolResultBlockParam> = [];
        for (const block of response.content) {
            if (block.type === "tool_use") {
                let output = '';
                const handler = TOOL_HANDLERS.get(block.name);

                tracer.log("tool_use", block.name);

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

                if (block.name === "todo") {
                    used_todo = true;
                }
            }
        }

        if (used_todo) {
            rounds_since_todo = 0;
            tracer.log("todo_used");
        } else {
            rounds_since_todo += 1;

            tracer.log("rounds_since_todo", String(rounds_since_todo));

            if (rounds_since_todo >= 3) {
                tracer.log("todo_reminder");
                results.unshift({
                    type: "text",
                    text: "<reminder>Update your todos.</reminder>"
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
    label: "规划与协调 >> TodoWrite",
    model: MODEL,
    system: SYSTEM,
});


