
import { z } from "zod";
import { fn } from "../../common/util/fn";
import type Anthropic from "@anthropic-ai/sdk";


type TodoStatus = "pending" | "in_progress" | "completed";

type TodoItem = {
    id: string;
    text: string;
    status: TodoStatus;
};

// TodoManager 是一个会话内的内存态任务管理器，供 LLM 通过 `todo` 工具写入。
// 它的职责主要有三件事：
// 1. 在接收 todo 列表前先做校验，
// 2. 强制执行简单规则，比如同一时间只能有一个 `in_progress`，
// 3. 把当前任务状态渲染成可读文本，再喂回模型继续使用。
//
// 它适合单次会话里的多步任务场景，例如：
// - 按步骤重构一个模块，
// - 先读文件 -> 再改代码 -> 再运行检查，
// - 跟踪哪些任务待做、进行中、已完成。
//
// 这个类是轻量且会话级的：
// 它不负责磁盘持久化，也不是长期任务系统，
// 更适合在一次对话循环中做短期规划和进度跟踪。
class TodoManager {
    items: TodoItem[] = [];

    update(items: Array<Record<string, unknown>>) {
        if (items.length > 20) {
            throw new Error("Max 20 todos allowed");
        }

        const validated: TodoItem[] = [];
        let inProgressCount = 0;

        for (const [index, item] of items.entries()) {
            const text = String(item.text ?? "").trim();
            const status = String(item.status ?? "pending").toLowerCase();
            const itemId = String(item.id ?? index + 1);

            if (!text) {
                throw new Error(`Item ${itemId}: text required`);
            }

            if (!["pending", "in_progress", "completed"].includes(status)) {
                throw new Error(`Item ${itemId}: invalid status '${status}'`);
            }

            if (status === "in_progress") {
                inProgressCount += 1;
            }

            validated.push({
                id: itemId,
                text,
                status: status as TodoStatus,
            });
        }

        if (inProgressCount > 1) {
            throw new Error("Only one task can be in_progress at a time");
        }

        this.items = validated;
        return this.render();
    }

    render() {
        if (this.items.length === 0) {
            return "No todos.";
        }

        const lines: string[] = [];

        for (const item of this.items) {
            const marker = {
                pending: "[ ]",
                in_progress: "[>]",
                completed: "[x]",
            }[item.status];

            lines.push(`${marker} #${item.id}: ${item.text}`);
        }

        const done = this.items.filter((item) => item.status === "completed").length;
        lines.push(`\n(${done}/${this.items.length} completed)`);

        return lines.join("\n");
    }
}

export const todoManager = new TodoManager();

const Todo = {
    name: "todo",
    description: "Update task list. Track progress on multi-step tasks.",
    input_schema: {
        type: "object",
        properties: {
            items: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        text: { type: "string" },
                        status: {
                            type: "string",
                            enum: ["pending", "in_progress", "completed"],
                        },
                    },
                    required: ["id", "text", "status"],
                },
            },
        },
        required: ["items"],
    },
} satisfies Anthropic.Tool;
const TodoInputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
            status: z.enum(["pending", "in_progress", "completed"]),
        }),
    ),
});
const todo = fn(TodoInputSchema, async ({ items }) => {
    const rendered = todoManager.update(items);
    console.log("\n[TODOS]");
    console.log(rendered);
    console.log();
    return rendered;
});

export {
    Todo,
    todo
}