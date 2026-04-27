import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { authAnthropic, build, model } from "../../common/main";
import { type WrappedFn } from "../../common/util/fn";
import { createTracer } from "../../common/util/trace";
import { Bash, bash, EditFile, editFile, ReadFile, readFile, WriteFile, writeFile } from "../../common/tools/fs";
import { autoCompact, compact, Compact, estimateTokens, microCompact, THRESHOLD } from "./tools";

const tracer = createTracer("compact");

const TOOL_HANDLERS = new Map<string, WrappedFn<z.ZodTypeAny, Promise<string>>>([
    ["bash", bash],
    ["read_file", readFile],
    ["write_file", writeFile],
    ["edit_file", editFile],
    ["compact", compact],
]);
const AUTH = authAnthropic()
const MODEL = model();
const SYSTEM = `You are a coding agent at ${import.meta.dir}. Use tools to solve tasks.`;
const TOOLS: Anthropic.Tool[] = [
    Bash,
    ReadFile,
    WriteFile,
    EditFile,   
    Compact,
]

async function loop(prompt: string): Promise<Anthropic.MessageParam[]> {
    const messages: Anthropic.MessageParam[] = [{
        role: "user",
        content: prompt,
    }];

    while(true) {
        //  Layer1: micro_compact before each LLM call
        microCompact(messages)
        // Layer2: auto_compact if token estimate exceeds threshold
        const estimatedTokens = estimateTokens(messages);
        if(estimatedTokens > THRESHOLD) {
            tracer.log("auto_compact", `triggered at ${estimatedTokens}/${THRESHOLD}`);
            messages.splice(0, messages.length, ...(await autoCompact(messages)));
        }

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

        if(response.stop_reason !== "tool_use") {
            break;
        }
        
        let manual_compact = false;
        const results: Array<Anthropic.TextBlockParam | Anthropic.ToolResultBlockParam> = [];
        for(const block of response.content) {
            if(block.type === "tool_use") {
                let output = '';
                if(block.name === "compact") {
                    manual_compact = true;
                    output = "Compressing...";
                }else {
                    const handler = TOOL_HANDLERS.get(block.name);
                    if(!handler) {
                        output = `Unknown tool: ${block.name}`;
                    }else{
                       try{
                        output = await handler(block.input);
                       }catch(err){
                        output = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
                    }
                    }
                }

                tracer.log("tool_use", `${block.name}`);
               
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

        //  Layer3: manual compact triggered by the compact tool
        if (manual_compact) {
            tracer.log("manual_compact", `triggered at est_tokens=${estimateTokens(messages)}`);
            messages.splice(0, messages.length, ...(await autoCompact(messages)));
        }

    }

    return messages;
}


build(loop).run({
    label: "内存管理 >> Compact",
    model: MODEL,
    system: SYSTEM,
});