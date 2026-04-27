import Anthropic from "@anthropic-ai/sdk";
import { build, authAnthropic, model } from "../../common/main";
import { bash, Bash } from "../../common/tools/fs";

const AUTH = authAnthropic();
const MODEL = model();
const SYSTEM = `You are a coding agent at ${process.cwd()}. Use bash to solve tasks. Act, don't explain.`;
const TOOLS: Anthropic.Tool[] = [
    Bash,
];

async function loop(prompt: string): Promise<Anthropic.MessageParam[]> {
    const messages:Anthropic.MessageParam[] = [];

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
                try {
                    const output = await bash(block.input);
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

    return messages;
}

build(loop).run({
    label: "工具与执行 >> Agent循环",
    model: MODEL,
    system: SYSTEM,
});