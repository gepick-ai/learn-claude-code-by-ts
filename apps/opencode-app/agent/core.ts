import { generateText, type ModelMessage } from "ai";
import { getModel } from "./model";
import { agentTools, toolHandlers } from "./tools";
import type { SessionMessages } from "./types";

export const MODEL = getModel();
export const SYSTEM =
  "You are a coding agent. Use the available tools to solve tasks. Act, don't explain.";
export const TOOLS = agentTools;
const MAX_STEPS = 30;

export async function agentLoop(
  prompt: string,
  history: SessionMessages
): Promise<SessionMessages> {
  const messages: SessionMessages = [...history];
  messages.push({
    role: "user",
    content: [{ type: "text", text: prompt }],
  });
  let step = 0;

  while (true) {
    step += 1;
    if (step > MAX_STEPS) {
      messages.push({
        role: "assistant",
        content: [{ type: "text", text: "Error: Agent loop exceeded maximum steps" }],
      });
      return messages;
    }

    const result = await generateText({
      model: MODEL,
      system: SYSTEM,
      messages,
      tools: TOOLS,
      maxOutputTokens: 8000,
    });

    messages.push(...result.response.messages);

    if (result.finishReason !== "tool-calls") {
      return messages;
    }

    const toolResults = [];

    for (const toolCall of result.toolCalls) {
      const handler = toolHandlers[toolCall.toolName as keyof typeof toolHandlers];

      let output: string;
      if (!handler) {
        output = `Unknown tool: ${toolCall.toolName}`;
      } else {
        try {
          output = await handler(toolCall.input as never);
        } catch (error) {
          output = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
      }

      toolResults.push({
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        output,
      });
    }

    messages.push({
      role: "tool",
      content: toolResults.map((result) => ({
        type: "tool-result" as const,
        toolCallId: result.toolCallId,
        toolName: result.toolName,
        output: {
          type: "text" as const,
          value: result.output,
        },
      })),
    });
  }
}
