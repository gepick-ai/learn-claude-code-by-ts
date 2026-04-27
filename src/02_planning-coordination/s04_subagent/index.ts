import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { authAnthropic, build, model } from "../../common/main";
import { fn, type WrappedFn } from "../../common/util/fn";
import { createTracer } from "../../common/util/trace";
import { bash, editFile, readFile, writeFile } from "../../common/tools/fs";
import { Task } from "./tools";

const TOOL_HANDLERS = new Map<string, WrappedFn<z.ZodTypeAny, Promise<string>>>([
    ["bash", bash],
    ["read_file", readFile],
    ["write_file", writeFile],
    ["edit_file", editFile],
]);
const AUTH = authAnthropic()
const MODEL = model();

const SUBAGENT_SYSTEM = `You are a coding subagent at ${process.cwd()}. Complete the given task, then summarize your findings.`;
const SUBAGENT_TOOLS: Anthropic.Tool[] = [
    {
        name: "bash",
        description: "Run a shell command.",
        input_schema: {
            type: "object",
            properties: {
                command: { type: "string" },
            },
            required: ["command"],
        },
    },
    {
        name: "read_file",
        description: "Read file contents.",
        input_schema: {
            type: "object",
            properties: {
                path: { type: "string" },
                limit: { type: "integer" },
            },
            required: ["path"],
        },
    },
    {
        name: "write_file",
        description: "Write content to file.",
        input_schema: {
            type: "object",
            properties: {
                path: { type: "string" },
                content: { type: "string" },
            },
            required: ["path", "content"],
        },
    },
    {
        name: "edit_file",
        description: "Replace exact text in file.",
        input_schema: {
            type: "object",
            properties: {
                path: { type: "string" },
                old_text: { type: "string" },
                new_text: { type: "string" },
            },
            required: ["path", "old_text", "new_text"],
        },
    },
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
                    trace.log("tool_use", block.name);

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
async function loop(prompt: string): Promise<Anthropic.MessageParam[]> {
    const messages:Anthropic.MessageParam[] = [];

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
                    const input = block.input as { prompt?: string; description?: string };
                    output = await subagent_loop({
                        prompt: String(input.prompt ?? ""),
                        description: input.description ? String(input.description) : undefined,
                    });
                } else {

                    if (!handler) {
                        output = `Unknown tool: ${block.name}`;
                    }else{
                        try {
                            output = await handler(block.input);
                        } catch (error) {
                            output = `Error: ${error}`;
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
    label: "规划与协调 >> subagent",
    model: MODEL,
    system: SYSTEM,
});