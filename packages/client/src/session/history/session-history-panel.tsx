import { useCallback, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { useSessionStore } from "../session-store"
import { DeleteSessionConfirmDialog } from "./delete-session-confirm-dialog"
import { SessionListItem } from "./session-list-item"
import { cn } from "@/util/cn"

export function SessionHistoryPanel() {
  const {
    sessions,
    currentProjectId,
    currentSessionId,
    listLoading,
    hydrated,
    lastError,
    deletingSessionId,
    createNewSession,
    selectSession,
    deleteSession,
    clearError,
  } = useSessionStore()

  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null)

  const openDeleteConfirm = useCallback(
    (id: string) => {
      const row = sessions.find((s) => s.id === id)
      setPendingDelete({ id, title: row?.title ?? "" })
    },
    [sessions],
  )

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-[240px] shrink-0 flex-col border-l border-slate-200 bg-white",
        "shadow-sm shadow-slate-200/50",
      )}
      aria-label="会话历史"
    >
      <div className="shrink-0 border-b border-slate-200 px-3 py-3">
        <p className="mb-2 truncate font-mono text-[11px] text-slate-500" title={currentProjectId ?? ""}>
          {currentProjectId ? `Project: ${currentProjectId}` : "请先创建或选择 Project"}
        </p>
        <button
          type="button"
          onClick={() => {
            void createNewSession()
          }}
          disabled={listLoading || !hydrated || !currentProjectId}
          className={cn(
            "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5",
            "bg-indigo-600 text-sm font-medium text-white",
            "transition-colors duration-200 hover:bg-indigo-700",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-2 focus:ring-offset-white",
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
      </div>

      {lastError && (
        <div className="shrink-0 border-b border-amber-200/90 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <p className="wrap-break-word">{lastError}</p>
          <button
            type="button"
            onClick={clearError}
            className="mt-1 cursor-pointer text-amber-800 underline-offset-2 hover:underline"
          >
            关闭
          </button>
        </div>
      )}

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
        {!hydrated || listLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            加载中…
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm leading-relaxed text-slate-500">
            尚无会话。点击「新建会话」开始。
          </p>
        ) : (
          sessions.map((s) => (
            <SessionListItem
              key={s.id}
              id={s.id}
              title={s.title}
              isActive={s.id === currentSessionId}
              isDeleting={deletingSessionId === s.id}
              onSelect={(id) => {
                void selectSession(id)
              }}
              onDelete={openDeleteConfirm}
            />
          ))
        )}
      </nav>

      <DeleteSessionConfirmDialog
        open={pendingDelete !== null}
        sessionTitle={pendingDelete?.title ?? ""}
        isDeleting={pendingDelete != null && deletingSessionId === pendingDelete.id}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          void (async () => {
            const ok = await deleteSession(pendingDelete.id)
            if (ok) setPendingDelete(null)
          })()
        }}
      />
    </aside>
  )
}
