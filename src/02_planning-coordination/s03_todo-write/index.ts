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
const SYSTEM = `You are a coding agent at ${process.cwd()}.
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

        // `response.content` 是数组，重点不是“有一段文字”，而是“同一轮里可能有多个 tool_use”。
        // 所以这里必须遍历整组 block，而不能假设只会有一个工具调用。
        //
        // 一个更贴近当前场景的真实 JSON 例子：
        // [
        //   {
        //     "type": "tool_use",
        //     "id": "toolu_123",
        //     "name": "bash",
        //     "input": { "command": "pwd" }
        //   },
        //   {
        //     "type": "tool_use",
        //     "id": "toolu_456",
        //     "name": "bash",
        //     "input": { "command": "ls" }
        //   }
        // ]
        //
        // 我的观察：
        // 1. 一次模型回复里，可能连续给出多个 `tool_use`。
        // 2. 所以这里要对每个 block 分别执行工具。
        // 3. 每个工具调用都要生成一个对应的 `tool_result`。
        // 4. 因此后面要把多个结果 `push` 到 `results` 里，再整批回填给模型。
        for (const block of response.content) {

            if (block.type === "tool_use") {
                let output = '';
                tracer.log("tool_use", block.name);
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


