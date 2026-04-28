import { History, Loader2, Plus } from "lucide-react"
import { ChatToolbarCodeSlot } from "./chat-toolbar-code-slot-context"
import { useSessionStore } from "../session-store"
import { cn } from "@/util/cn"

export function SessionChatToolbar() {
  const listLoading = useSessionStore((s) => s.listLoading)
  const hydrated = useSessionStore((s) => s.hydrated)
  const currentProjectId = useSessionStore((s) => s.currentProjectId)
  const hasProjects = useSessionStore((s) => s.projects.length > 0)
  const createNewSession = useSessionStore((s) => s.createNewSession)
  const toggleSessionHistory = useSessionStore((s) => s.toggleSessionHistory)

  const disableNew = listLoading || !hydrated || !currentProjectId
  const disableHistory = listLoading || !hydrated || !hasProjects

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-slate-200/90 bg-slate-50/90 px-2 py-2"
      role="toolbar"
      aria-label="会话工具栏"
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2" aria-label="代码业务工具集">
        <ChatToolbarCodeSlot />
      </div>
      <div className="min-w-0 flex-1" />
      <div className="flex shrink-0 items-center gap-2" aria-label="会话业务工具集">
        <button
          type="button"
          disabled={disableNew}
          onClick={() => {
            void createNewSession()
          }}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-white",
            "bg-indigo-600 transition-colors hover:bg-indigo-700",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {listLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={2} aria-hidden />
          ) : (
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          )}
          新建会话
        </button>
        <button
          type="button"
          disabled={disableHistory}
          onClick={() => toggleSessionHistory()}
          aria-label="会话历史"
          title="会话历史"
          className={cn(
            "inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600",
            "transition-colors hover:bg-slate-100 hover:text-slate-900",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <History className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  )
}
