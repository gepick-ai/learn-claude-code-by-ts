import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { auth, build, model } from "../../common/main";
import { type WrappedFn } from "../../common/util/fn";
import { createTracer } from "../../common/util/trace";
import { Bash, bash, EditFile, editFile, ReadFile, readFile, WriteFile, writeFile } from "../../common/tools/fs";
import { CheckBackground, checkBackground, RunBackground, runBackground, bgManager } from "./tools";

const tracer = createTracer("background-tasks");

const TOOL_HANDLERS = new Map<string, WrappedFn<z.ZodTypeAny, Promise<string>>>([
    ["bash", bash],
    ["read_file", readFile],
    ["write_file", writeFile],
    ["edit_file", editFile],
    ["run_background", runBackground],
    ["check_background", checkBackground],
]);
const AUTH = auth()
const MODEL = model();
const SYSTEM = `You are a coding agent at ${import.meta.dirname}. Use run_background for long-running commands.`;
const TOOLS: Anthropic.Tool[] = [
    Bash,
    ReadFile,
    WriteFile,
    EditFile,
    RunBackground,
    CheckBackground,
]

const messages: Anthropic.MessageParam[] = [];

async function loop(prompt: string): Promise<Anthropic.MessageParam[]> {
    messages.push({
        role: "user",
        content: prompt,
    });

    while (true) {
        const notifs =  bgManager.drainNotifications();
        tracer.log("loop_iter", `drained=${notifs.length}`);
        if (notifs.length > 0 && messages.length > 0) {
            const notifText = notifs
                .map((n) => {
                    return `[bg:${n.taskId}] ${n.status}: ${n.result}`;
                })
                .join("\n");
            messages.push({
                role: "user",
                content: `<background-results>\n${notifText}\n</background-results>`,
            });
            tracer.log("inject_background_results", `${notifText.slice(0, 200)}`);
            messages.push({
                role: "assistant",
                content: "Noted background results.",
            });
        }

        const response = await AUTH.messages.create({
            model: MODEL,
            system: SYSTEM,
            messages,
            tools: TOOLS,
            max_tokens: 8000,
        });
        tracer.log(
            "llm_response",
            `stop_reason=${response.stop_reason} contentBlocks=${response.content.length}`,
        );

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

                tracer.log(
                    "tool_result",
                    `${block.name} id=${block.id} outputPreview=${String(output).slice(0, 200)}`,
                );
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
    label: "并发 >> Background Tasks",
    model: MODEL,
    system: SYSTEM,
});