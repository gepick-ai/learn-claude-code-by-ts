import path from "node:path";
import { mkdir, readdir } from "node:fs/promises";
import { fn } from "../../common/util/fn";
import z from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { createTracer } from "../../common/util/trace";

type TaskStatus = "pending" | "in_progress" | "completed";

type Task = {
    id: number;
    subject: string;
    description: string;
    status: TaskStatus;
    blockedBy: number[];
    blocks: number[];
    owner: string;
};

const tracer = createTracer("tasks");

class TaskManager {
    private nextId = 1;

    constructor(public readonly tasksDir: string) {}

    async init() {
        await mkdir(this.tasksDir, { recursive: true });
        this.nextId = await this.maxId() + 1;
        tracer.log("init", `dir=${this.tasksDir}, next_id=${this.nextId}`);
    }

    private async maxId() {
        const files = await this.listTaskFiles();
        const ids = files
            .map((fileName) => Number(path.basename(fileName, ".json").split("_")[1]))
            .filter((id) => Number.isInteger(id));

        return ids.length > 0 ? Math.max(...ids) : 0;
    }

    private taskPath(taskId: number) {
        return path.join(this.tasksDir, `task_${taskId}.json`);
    }

    private async listTaskFiles() {
        const entries = await readdir(this.tasksDir, { withFileTypes: true });
        return entries
            .filter((entry) => entry.isFile() && /^task_\d+\.json$/.test(entry.name))
            .map((entry) => entry.name)
            .sort();
    }

    private async load(taskId: number): Promise<Task> {
        const file = Bun.file(this.taskPath(taskId));
        if (!(await file.exists())) {
            throw new Error(`Task ${taskId} not found`);
        }

        const task = await file.json() as Task;
        tracer.log("task_loaded", `id=${task.id}, status=${task.status}`);
        return task;
    }

    private async save(task: Task) {
        await Bun.write(this.taskPath(task.id), `${JSON.stringify(task, null, 2)}\n`);
        tracer.log("task_saved", `id=${task.id}, status=${task.status}`);
    }

    async create(subject: string, description = "") {
        const task: Task = {
            id: this.nextId,
            subject,
            description,
            status: "pending",
            blockedBy: [],
            blocks: [],
            owner: "",
        };

        await this.save(task);
        this.nextId += 1;
        tracer.log("task_created", `id=${task.id}, subject=${task.subject}`);
        return JSON.stringify(task, null, 2);
    }

    async get(taskId: number) {
        tracer.log("task_get", `id=${taskId}`);
        return JSON.stringify(await this.load(taskId), null, 2);
    }

    async update(
        taskId: number,
        status?: TaskStatus,
        addBlockedBy?: number[],
        addBlocks?: number[],
    ) {
        const task = await this.load(taskId);
        const changes: string[] = [];

        if (status) {
            task.status = status;
            changes.push(`status=${status}`);
            if (status === "completed") {
                await this.clearDependency(taskId);
            }
        }

        if (addBlockedBy && addBlockedBy.length > 0) {
            task.blockedBy = [...new Set([...task.blockedBy, ...addBlockedBy])];
            changes.push(`addBlockedBy=[${addBlockedBy.join(", ")}]`);
        }

        if (addBlocks && addBlocks.length > 0) {
            task.blocks = [...new Set([...task.blocks, ...addBlocks])];
            changes.push(`addBlocks=[${addBlocks.join(", ")}]`);

            for (const blockedId of addBlocks) {
                try {
                    const blockedTask = await this.load(blockedId);
                    if (!blockedTask.blockedBy.includes(taskId)) {
                        blockedTask.blockedBy.push(taskId);
                        await this.save(blockedTask);
                        tracer.log("dependency_linked", `task=${taskId} -> blocked=${blockedId}`);
                    }
                } catch {
                    // Ignore missing blocked tasks to match the Python version.
                }
            }
        }

        await this.save(task);
        tracer.log("task_updated", `id=${taskId}${changes.length > 0 ? `, ${changes.join(", ")}` : ""}`);
        return JSON.stringify(task, null, 2);
    }

    private async clearDependency(completedId: number) {
        const files = await this.listTaskFiles();

        for (const fileName of files) {
            const matched = fileName.match(/^task_(\d+)\.json$/);
            if (!matched) continue;

            const task = await this.load(Number(matched[1]));
            if (!task.blockedBy.includes(completedId)) continue;

            task.blockedBy = task.blockedBy.filter((id) => id !== completedId);
            await this.save(task);
            tracer.log("dependency_cleared", `completed=${completedId}, task=${task.id}`);
        }
    }

    async listAll() {
        const files = await this.listTaskFiles();
        const tasks: Task[] = [];

        for (const fileName of files) {
            const matched = fileName.match(/^task_(\d+)\.json$/);
            if (!matched) continue;
            tasks.push(await this.load(Number(matched[1])));
        }

        if (tasks.length === 0) {
            tracer.log("task_list", "empty");
            return "No tasks.";
        }

        tracer.log("task_list", `count=${tasks.length}`);

        const lines: string[] = [];
        for (const task of tasks) {
            const marker = {
                pending: "[ ]",
                in_progress: "[>]",
                completed: "[x]",
            }[task.status] ?? "[?]";
            const blocked = task.blockedBy.length > 0
                ? ` (blocked by: [${task.blockedBy.join(", ")}])`
                : "";

            lines.push(`${marker} #${task.id}: ${task.subject}${blocked}`);
        }

        return lines.join("\n");
    }
}

const taskManager = new TaskManager(path.join(import.meta.dir, ".tasks"));
await taskManager.init();




const CreateTask = {
    name: "create_task",
    description: "Create a new task.",
    input_schema: {
        type: "object",
        properties: {
            subject: { type: "string" },
            description: { type: "string" },
        },
        required: ["subject"],
    },
} satisfies Anthropic.Tool;
const CreateTaskInputSchema = z.object({
    subject: z.string(),
    description: z.string().optional(),
});
const createTask = fn(CreateTaskInputSchema, async ({ subject, description }) => {
    tracer.log("tool_create_task", `subject=${subject}`);
    return await taskManager.create(subject, description);
})
export {
    CreateTask,
    createTask,
}

const UpdateTask = {
    name: "update_task",
    description: "Update a task's status or dependencies.",
    input_schema: {
        type: "object",
        properties: {
            task_id: { type: "integer" },
            status: {
                type: "string",
                enum: ["pending", "in_progress", "completed"],
            },
            addBlockedBy: {
                type: "array",
                items: { type: "integer" },
            },
            addBlocks: {
                type: "array",
                items: { type: "integer" },
            },
        },
        required: ["task_id"],
    },
} satisfies Anthropic.Tool;
const UpdateTaskInputSchema = z.object({
    task_id: z.number(),
    status: z.enum(["pending", "in_progress", "completed"]).optional(),
    addBlockedBy: z.array(z.number()).optional(),
    addBlocks: z.array(z.number()).optional(),
});
const updateTask = fn(UpdateTaskInputSchema, async ({ task_id, status, addBlockedBy, addBlocks }) => {
    tracer.log(
        "tool_update_task",
        `id=${task_id}, status=${status ?? "-"}, addBlockedBy=${addBlockedBy?.join(",") ?? "-"}, addBlocks=${addBlocks?.join(",") ?? "-"}`,
    );
    return await taskManager.update(task_id, status, addBlockedBy, addBlocks);
})
export {
    UpdateTask,
    updateTask,
}


const ListTask = {
    name: "list_task",
    description: "List all tasks with status summary.",
    input_schema: {
        type: "object",
        properties: {},
    },
} satisfies Anthropic.Tool;
const ListTasksInputSchema = z.object({});
const listTask = fn(ListTasksInputSchema, async () => {
    tracer.log("tool_list_task");
    return await taskManager.listAll();
})
export {
    ListTask,
    listTask,
}

const GetTask = {
    name: "get_task",
    description: "Get full details of a task by ID.",
    input_schema: {
        type: "object",
        properties: {
            task_id: { type: "integer" },
        },
        required: ["task_id"],
    },
} satisfies Anthropic.Tool;
const GetTaskInputSchema = z.object({
    task_id: z.number(),
});
const getTask = fn(GetTaskInputSchema, async ({ task_id }) => {
    tracer.log("tool_get_task", `id=${task_id}`);
    return await taskManager.get(task_id);
})
export {
    GetTask,
    getTask,
}