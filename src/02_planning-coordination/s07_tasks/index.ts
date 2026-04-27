import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { authAnthropic, build, model } from "../../common/main";
import { type WrappedFn } from "../../common/util/fn";
import { createTracer } from "../../common/util/trace";
import { Bash, bash, EditFile, editFile, ReadFile, readFile, WriteFile, writeFile } from "../../common/tools/fs";
import { CreateTask, createTask, GetTask, getTask, ListTask, listTask, UpdateTask, updateTask } from "./tools";

const TOOL_HANDLERS = new Map<string, WrappedFn<z.ZodTypeAny, Promise<string>>>([
    ["bash", bash],
    ["read_file", readFile],
    ["write_file", writeFile],
    ["edit_file", editFile],
    ["create_task", createTask],
    ["update_task", updateTask],
    ["list_task", listTask],
    ["get_task", getTask],
]);
const AUTH = authAnthropic()
const MODEL = model();
const SYSTEM = `You are a coding agent at ${process.cwd()}. Use task tools to plan and track work.`;
const tracer = createTracer("tasks-loop");
const TOOLS: Anthropic.Tool[] = [
    Bash,
    ReadFile,
    WriteFile,
    EditFile,
    CreateTask,
    UpdateTask,
    ListTask,
    GetTask,
];

async function loop(prompt: string): Promise<Anthropic.MessageParam[]> {
    const messages: Anthropic.MessageParam[] = [
        {
            role: "user",
            content: prompt,
        }
    ]

    while(true) {
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

        if(response.stop_reason !== "tool_use") {
            break;
        }

        const results: Array<Anthropic.TextBlockParam | Anthropic.ToolResultBlockParam> = [];
        for(const block of response.content) {
            if(block.type === "tool_use") {
                let output = '';
                tracer.log("tool_use", block.name);
                const handler = TOOL_HANDLERS.get(block.name);
                if(!handler) {
                    output = `Unknown tool: ${block.name}`;
                    tracer.log("tool_missing", block.name);
                }else{
                    try{
                        output = await handler(block.input);
                        tracer.log("tool_result", `${block.name}: ${String(output).slice(0, 200)}`);
                    }catch(err){
                        output = `Error: ${err}`;
                        tracer.error(`tool_error:${block.name}`, err);
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
        })
    }

    return messages;
}

build(loop).run({
    label: "规划与协调 >> Tasks",
    model: MODEL,
    system: SYSTEM,
});