import { useEffect } from "react"
import { SessionChatPanel, useSessionSse } from "./chat"
import { SessionHistoryDrawer } from "./history"
import { ProjectPanel } from "./project"
import { SessionSlotPanel } from "./slot"
import { useSessionStore } from "./session-store"
import { cn } from "@/util/cn"

/** 会话壳（v6）：左 project / 中 slot+chat（2:1）；会话历史为叠层抽屉。 */
export function SessionPage() {
  useSessionSse()

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
      <SessionHistoryDrawer />
    </div>
  )
}
