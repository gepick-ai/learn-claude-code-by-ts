import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { auth, build, model } from "../../common/main";
import { fn, type WrappedFn } from "../../common/util/fn";
import { createTracer } from "../../common/util/trace";
import { Bash, bash, EditFile, editFile, ReadFile, readFile, WriteFile, writeFile } from "../../common/tools/fs";
import { Task } from "./tools";

const TOOL_HANDLERS = new Map<string, WrappedFn<z.ZodTypeAny, Promise<string>>>([
    ["bash", bash],
    ["read_file", readFile],
    ["write_file", writeFile],
    ["edit_file", editFile],
]);
const AUTH = auth()
const MODEL = model();

const SUBAGENT_SYSTEM = `You are a coding subagent at ${import.meta.dirname}. Complete the given task, then summarize your findings.`;
const SUBAGENT_TOOLS: Anthropic.Tool[] = [
   Bash,
   ReadFile,
   WriteFile,
   EditFile,
];
const subagent_loop = fn(
    z.object({
        prompt: z.string(),
        description: z.string().optional(),
    }),
    async ({ prompt, description }) => {
        const trace = createTracer(description ? `subagent:${description}` : "subagent");
        trace.log("start", prompt.slice(0, 80));

        const messages: Anthropic.MessageParam[] = [
            {
                role: 'user',
                content: prompt,
            }
        ];

        let response: Anthropic.Messages.Message | null = null;

        for (let i = 0; i < 30; i++) {
            trace.log("round", String(i + 1));
            response = await AUTH.messages.create({
                model: MODEL,
                system: SUBAGENT_SYSTEM,
                messages,
                tools: SUBAGENT_TOOLS,
                max_tokens: 8000,
            });

            messages.push({
                role: 'assistant',
                content: response.content,
            })

            if (response.stop_reason !== 'tool_use') {
                break;
            }

            const results: Array<Anthropic.TextBlockParam | Anthropic.ToolResultBlockParam> = [];

            for (const block of response.content) {
                if (block.type === 'tool_use') {
                    let output = '';
                    const handler = TOOL_HANDLERS.get(block.name);

                    trace.log("tool_use", block.name);

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
                        type: 'tool_result',
                        tool_use_id: block.id,
                        content: output,
                    })
                }
            }

            messages.push({
                role: 'user',
                content: results,
            })
        }

        // 只要最后一次的response做处理
        const summary = response?.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("") || "(no summary)";
        trace.log("done", summary.slice(0, 120));
        return summary;
})


const SYSTEM = `You are a coding agent at ${process.cwd()}. Use the task tool to delegate exploration or subtasks.`
const TOOLS: Anthropic.Tool[] = [
    Task,
    ...SUBAGENT_TOOLS,
]

const messages: Anthropic.MessageParam[] = [];

async function loop(prompt: string): Promise<Anthropic.MessageParam[]> {
    messages.push({
        role: "user",
        content: prompt,
    });

    const trace = createTracer("parent");
    trace.log("start");

    while (true) {
        const response = await AUTH.messages.create({
            model: MODEL,
            system: SYSTEM,
            messages,
            tools: TOOLS,
            max_tokens: 8000,
        });

        messages.push({
            role: 'assistant',
            content: response.content,
        })

        if (response.stop_reason !== 'tool_use') {
            break;
        }

        const results: Array<Anthropic.TextBlockParam | Anthropic.ToolResultBlockParam> = [];

        for (const block of response.content) {
            if (block.type === 'tool_use') {
                let output = '';
                trace.log("tool_use", block.name);

                const handler = TOOL_HANDLERS.get(block.name);

                if (block.name === 'task') {
                    output = await subagent_loop(block.input);
                } else {
                    if (!handler) {
                        output = `Unknown tool: ${block.name}`;
                    }else{
                        try {
                            output = await handler(block.input);
                        } catch (err) {
                            output = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
                        }
                    }       
                }

                results.push({
                    type: 'tool_result',
                    tool_use_id: block.id,
                    content: output,
                })
            }
        }

        messages.push({
            role: 'user',
            content: results,
        })
    }

    return messages;
}

build(loop).run({
    label: "规划与协调 >> SubAgent",
    model: MODEL,
    system: SYSTEM,
});