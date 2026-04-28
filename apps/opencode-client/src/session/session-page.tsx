import { SessionChatPanel } from "./chat"
import { SessionHistoryPanel } from "./history"
import { useSessionSse } from "./sse/use-session-sse"
import { cn } from "@/util/cn"

/**
 * 会话壳：左 history / 右 chat（见 docs/会话界面/v1.md）。
 */
export function SessionPage() {
  useSessionSse()
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-1 flex-row overflow-hidden antialiased",
        "bg-slate-100 text-slate-900",
        "selection:bg-indigo-200/80",
      )}
    >
      <SessionHistoryPanel />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <SessionChatPanel />
      </div>
    </div>
  )
}
