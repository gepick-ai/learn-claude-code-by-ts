import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { authAnthropic, build, model } from "../../common/main";
import { type WrappedFn } from "../../common/util/fn";
import { createTracer } from "../../common/util/trace";
import { Bash, bash, EditFile, editFile, ReadFile, readFile, WriteFile, writeFile } from "../../common/tools/fs";
import { loadSkill, LoadSkill, skillLoader } from "./tools";

const tracer = createTracer("skills");

const TOOL_HANDLERS = new Map<string, WrappedFn<z.ZodTypeAny, Promise<string>>>([
    ["bash", bash],
    ["read_file", readFile],
    ["write_file", writeFile],
    ["edit_file", editFile],
    ["load_skill", loadSkill],
]);
const AUTH = authAnthropic()
const MODEL = model();
const SYSTEM = `You are a coding agent at ${process.cwd()}.
Use load_skill to access specialized knowledge before tackling unfamiliar topics.
Skills available:
${skillLoader.getDescriptions()}`;
const TOOLS: Anthropic.Tool[] = [
    Bash,
    ReadFile,
    WriteFile,
    EditFile,   
    LoadSkill,
]

async function loop(prompt: string): Promise<Anthropic.MessageParam[]> {
    const messages:Anthropic.MessageParam[] = [];

    messages.push({
        role: "user",
        content: prompt,
    });

    let round = 0;
    while(true) {
        round += 1;
        tracer.log("round", String(round));
        const response = await AUTH.messages.create({
            model: MODEL,
            system: SYSTEM,
            messages,
            tools: TOOLS,
            max_tokens: 8000,
        })

        messages.push({
            role: "assistant",
            content: response.content,
        })

        tracer.log("stop_reason", response.stop_reason ?? "none");

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
                }else{
                    output = await handler(block.input);
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
    label: "规划与协调 >> Skills",
    model: MODEL,
    system: SYSTEM,
});