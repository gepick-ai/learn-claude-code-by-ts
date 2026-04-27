import Anthropic from "@anthropic-ai/sdk";
import { type WrappedFn } from "../../common/util/fn";
import { build, auth, model } from "../../common/main";
import { ALL_TOOLS, TOOL_MAP, ANTHROPIC_TOOLS } from "../../common/tools";

const AUTH = auth();
const MODEL = model();
const SYSTEM = `You are a coding agent at ${process.cwd()}. Use bash to solve tasks. Act, don't explain.`;

async function loop(messages: Anthropic.MessageParam[]) {
    while (true) {
        const response = await AUTH.messages.create({
            model: MODEL,
            system: SYSTEM,
            messages,
            tools: ANTHROPIC_TOOLS,
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
                const tool = TOOL_MAP[block.name];
                
                if (!tool) {
                    results.push({
                        type: "tool_result",
                        tool_use_id: block.id,
                        content: `Unknown tool: ${block.name}`,
                    });
                    continue;
                }

                try {
                    const output = await tool.execute(block.input);
                    results.push({
                        type: "tool_result",
                        tool_use_id: block.id,
                        content: output,
                    });
                } catch (error) {
                    results.push({
                        type: "tool_result",
                        tool_use_id: block.id,
                        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                    });
                }
            }
        }

        messages.push({
            role: "user",
            content: results,
        });
    }
}

build(loop, {
    label: "工具与执行 >> Agent循环",
    model: MODEL,
    system: SYSTEM,
}).run();