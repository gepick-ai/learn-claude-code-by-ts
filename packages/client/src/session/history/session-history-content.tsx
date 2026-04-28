import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useSessionStore } from "../session-store"
import { DeleteSessionConfirmDialog } from "./delete-session-confirm-dialog"
import { SessionListItem } from "./session-list-item"

export type SessionHistoryContentProps = {
  /** 供抽屉层判断：删除确认打开时不应被 Escape 关掉抽屉 */
  onDeleteDialogOpenChange?: (open: boolean) => void
}

export function SessionHistoryContent({ onDeleteDialogOpenChange }: SessionHistoryContentProps) {
  const {
    sessions,
    currentProjectId,
    currentSessionId,
    listLoading,
    hydrated,
    lastError,
    deletingSessionId,
    selectSession,
    deleteSession,
    clearError,
    setSessionHistoryOpen,
  } = useSessionStore()

  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    onDeleteDialogOpenChange?.(pendingDelete !== null)
  }, [pendingDelete, onDeleteDialogOpenChange])

  const openDeleteConfirm = useCallback(
    (id: string) => {
      const row = sessions.find((s) => s.id === id)
      setPendingDelete({ id, title: row?.title ?? "" })
    },
    [sessions],
  )

  const handleSelectSession = useCallback(
    (id: string) => {
      void (async () => {
        await selectSession(id)
        setSessionHistoryOpen(false)
      })()
    },
    [selectSession, setSessionHistoryOpen],
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 px-3 py-2">
        <p className="truncate font-mono text-[11px] text-slate-500" title={currentProjectId ?? ""}>
          {currentProjectId ? `Project: ${currentProjectId}` : "请先创建或选择 Project"}
        </p>
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
            尚无会话。请在 Chat 工具栏点击「新建会话」。
          </p>
        ) : (
          sessions.map((s) => (
            <SessionListItem
              key={s.id}
              id={s.id}
              title={s.title}
              isActive={s.id === currentSessionId}
              isDeleting={deletingSessionId === s.id}
              onSelect={handleSelectSession}
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
    </div>
  )
}
