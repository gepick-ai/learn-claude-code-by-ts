import Anthropic from "@anthropic-ai/sdk";
import { build, authAnthropic, model } from "../../common/main";
import { bash, Bash } from "../../common/tools/fs";

const AUTH = authAnthropic();
const MODEL = model();
const SYSTEM = `You are a coding agent at ${import.meta.dir}. Use bash to solve tasks. Act, don't explain.`;
const TOOLS: Anthropic.Tool[] = [Bash];

async function loop(prompt: string): Promise<Anthropic.MessageParam[]> {
    const messages: Anthropic.MessageParam[] = [
        {
            role: "user",
            content: prompt,
        }
    ];

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
        const results: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
            if (block.type === "tool_use") {
                let output: string;
                try {
                    output = await bash(block.input);
                } catch (err) {
                    output = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
                }

                results.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: output,
                })
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