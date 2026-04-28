import type Anthropic from "@anthropic-ai/sdk";

export const Task = {
    name: "task",
    description: "Spawn a subagent with fresh context. It shares the filesystem but not conversation history.",
    input_schema: {
        type: "object",
        properties: {
            prompt: { type: "string" },
            description: {
                type: "string",
                description: "Short description of the task",
            },
        },
        required: ["prompt"],
    },
} satisfies Anthropic.Tool;