// 这个 tracer 先保持最小可用，只通过一个字符串前缀来区分日志来源。
// 例如：
// - `createTracer("parent")`  -> `[parent] ...`
// - `createTracer("subagent")` -> `[subagent] ...`
// - `createTracer("subagent:inspect-tests")` -> `[subagent:inspect-tests] ...`
//
// 这样做的目的不是做完整 tracing，而是先让终端日志更容易看：
// 1. 一眼区分主 agent 和 subagent，
// 2. 在需要时也能通过字符串自行区分不同子任务，
// 3. API 保持简单，直接 `tracer.log(...)` 就能用。
// 如果某个 tracer 不想输出，可以用 `createTracer("label", false)` 关闭。
type TraceEvent = {
    label: string;
    event: string;
    detail?: string;
    ts: number;
};

const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

function formatPrefix(label: string) {
    return `${GREEN}[${label}]${RESET}`;
}

const traceEvents: TraceEvent[] = [];

export function createTracer(label: string, enabled = true) {
    return {
        log(event: string, detail?: string) {
            const entry: TraceEvent = {
                label,
                event,
                detail,
                ts: Date.now(),
            };

            traceEvents.push(entry);

            if (!enabled) {
                return;
            }

            if (detail) {
                console.log(`${formatPrefix(label)} ${event}: ${detail}`);
            } else {
                console.log(`${formatPrefix(label)} ${event}`);
            }
        },
        error(event: string, detail?: unknown) {
            const message = detail instanceof Error
                ? detail.stack ?? detail.message
                : detail === undefined
                    ? undefined
                    : String(detail);
            this.log(event, message);
        },
        getEvents() {
            return traceEvents;
        },
    };
}

export type Tracer = ReturnType<typeof createTracer>;
