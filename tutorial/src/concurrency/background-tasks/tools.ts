import type Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { fn } from "../../common/util/fn";
import { createTracer } from "../../common/util/trace";
import { timeoutReject } from "../../common/util/async";
import z from "zod";

const WORKDIR = path.resolve(import.meta.dir, ".");

const TASK_TIMEOUT_MS = 300_000;
const OUTPUT_LIMIT = 50_000; // 完整stdout+stderr截断上限
const NOTIFICATION_RESULT_LIMIT = 500; // 通知队列入队时的result截断
const COMMAND_PREVIEW_IN_NOTIF = 80; // 通知里的command前缀

const tracer = createTracer("background-tasks:manager");

type TaskStatus = "running" | "completed" | "timeout" | "error";

type Task = {
    id: string;
    command: string;
    status: TaskStatus;
    result?: string;
    error?: string;
};

type Notification = {
    taskId: string;
    status: TaskStatus;
    command: string;
    result: string;
};

class BackgroundManager {
    private tasks = new Map<string, Task>();
    private notifications: Notification[] = [];

    run(command: string): string {
        const id = crypto.randomUUID().slice(0, 8);
        tracer.log("run", `${id} cmd=${String(command).slice(0, 80)}`);
        this.tasks.set(id, {
            id,
            command,
            status: "running",
        });

        // Fire-and-forget: 必须立刻返回，不能阻塞 tool 响应。
        this.execute(id, command);
        return id;
    }

    private async execute(taskId: string, command: string): Promise<void> {
        let subProcess;
        try {
            tracer.log("execute_start", `${taskId}`);
            subProcess = Bun.spawn(["sh", "-lc", command], {
                cwd: WORKDIR,
                stdout: "pipe",
                stderr: "pipe",
            });


            const stdoutPromise = subProcess.stdout?.text() ?? Promise.resolve("");
            const stderrPromise = subProcess.stderr?.text() ?? Promise.resolve("");
    
            const raceResult = await Promise.race([
                Promise.all([stdoutPromise, stderrPromise, subProcess.exited]).then(([stdout, stderr, exitCode]) => ({ stdout, stderr, exitCode })),
                timeoutReject<never>(TASK_TIMEOUT_MS, "timeout"),
            ]);
    
            const result = (raceResult.stdout + raceResult.stderr).trim().slice(0, OUTPUT_LIMIT);
            const status: TaskStatus = raceResult.exitCode === 0 ? "completed" : "error";


            this.updateTask(taskId, status, result);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            if (message === "timeout") {
                tracer.log("timeout", `${taskId}`);
                try {
                    subProcess?.kill?.();
                } catch {
                    // ignore best-effort kill failure
                }

                const output = `Error: Timeout (${TASK_TIMEOUT_MS / 1000}s)`;
                this.updateTask(taskId, "timeout", output);

                return;
            }

            tracer.error("execute_error", error);
            this.updateTask(taskId, "error", message);  
        }
    }

    check(taskId?: string): string {
        if (taskId) {
            const t = this.tasks.get(taskId);
            if (!t) return `Error: Unknown task ${taskId}`;
            tracer.log("check", `${taskId} status=${t.status}`);
            return `[${t.status}] ${t.command.slice(0, 60)}\n${t.result ?? t.error ?? "(running)"
                }`;
        }

        const lines: string[] = [];
        for (const [id, t] of this.tasks.entries()) {
            lines.push(`${id}: [${t.status}] ${t.command.slice(0, 60)}`);
        }
        return lines.length ? lines.join("\n") : "No background tasks.";
    }

    drainNotifications(): Notification[] {
        tracer.log("drainNotifications", `count=${this.notifications.length}`);
        const items = [...this.notifications];
        this.notifications = [];
        return items;
    }

    private updateTask(taskId: string, status: TaskStatus, result?: string, error?: string): void {
        const task = this.tasks.get(taskId);
        if (!task) return;

        this.tasks.set(taskId, {
            id: taskId,
            command: this.tasks.get(taskId)?.command ?? "",
            status,
            result,
            error,
        });

        this.notifications.push({
            taskId,
            status,
            command: (this.tasks.get(taskId)?.command ?? "").slice(0, COMMAND_PREVIEW_IN_NOTIF),
            result: String(result ?? error ?? "(no output)").slice(0, NOTIFICATION_RESULT_LIMIT),
        });

        tracer.log(
            "updateTask",
            `${taskId} status=${status} resultPreview=${String(result ?? error ?? "").slice(0, 80)}`,
        );
    }
}

const bgManager = new BackgroundManager();

const RunBackground = {
    name: "run_background",
    description: "Run command in background thread. Returns task_id immediately.",
    input_schema: {
        type: "object",
        properties: {
            command: { type: "string" },
        },
        required: ["command"],
    },
} satisfies Anthropic.Tool;
const RunBackgroundInputSchema = z.object({
    command: z.string(),
});
const runBackground = fn(RunBackgroundInputSchema, async ({ command }) => {
    const taskId =  bgManager.run(command);
    return taskId;
});
export {
    bgManager,
    RunBackground,
    runBackground,
};


const CheckBackground = {
    name: "check_background",
    description: "Check background task status. Omit task_id to list all.",
    input_schema: {
        type: "object",
        properties: {
            task_id: { type: "string" },
        },
    },
} satisfies Anthropic.Tool;
const CheckBackgroundInputSchema = z.object({
    task_id: z.string().optional(),
});
const checkBackground = fn(
    CheckBackgroundInputSchema,
    async ({ task_id }) => {
        return bgManager.check(task_id);
    },
);
export {
    CheckBackground,
    checkBackground,
};