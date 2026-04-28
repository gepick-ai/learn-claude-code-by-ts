/**
 * ============================================
 * Agent 核心层
 * 这部分与交互方式无关（Terminal/Web 都能用）
 * ============================================
 */
import Anthropic from "@anthropic-ai/sdk";
import { auth, model } from "@agent-dev/learn-claude-code/common/main";
import { bash, Bash } from "@agent-dev/learn-claude-code/common/tools/fs";

export const AUTH = auth();
export const MODEL = model();
export const SYSTEM = `You are a coding agent. Use bash to solve tasks. Act, don't explain.`;
export const TOOLS: Anthropic.Tool[] = [Bash];

/**
 * 核心 Agent Loop（来自 s01）
 */
export async function agentLoop(
  prompt: string,
  messages: Anthropic.MessageParam[]
): Promise<Anthropic.MessageParam[]> {
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
