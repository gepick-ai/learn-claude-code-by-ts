import { useEffect } from "react"
import { SessionChatPanel, useSessionSse } from "./chat"
import { SessionHistoryPanel } from "./history"
import { ProjectPanel } from "./project"
import { SessionSlotPanel } from "./slot"
import { useSessionStore } from "./session-store"
import { cn } from "@/util/cn"

/** 会话壳：左 project / 中 slot+chat（2:1）/ 右 history（无 project 时隐藏 history）。 */
export function SessionPage() {
  useSessionSse()
  const hasProjects = useSessionStore((s) => s.projects.length > 0)

  useEffect(() => {
    void useSessionStore.getState().hydrate()
  }, [])

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-1 flex-row overflow-hidden antialiased",
        "bg-slate-100 text-slate-900",
        "selection:bg-indigo-200/80",
      )}
    >
      <ProjectPanel />
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <SessionSlotPanel />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <SessionChatPanel />
        </div>
      </div>
      {hasProjects && <SessionHistoryPanel />}
    </div>
  )
}
