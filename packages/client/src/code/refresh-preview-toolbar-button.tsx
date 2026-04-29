import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { useSessionStore } from "@/session/session-store"
import { cn } from "@/util/cn"
import { useCodeStore } from "./code-store"

const EMPTY_MESSAGES: ReturnType<typeof useSessionStore.getState>["messagesBySession"][string] = []

export function RefreshPreviewToolbarButton() {
  const [refreshing, setRefreshing] = useState(false)
  const currentSessionId = useSessionStore((s) => s.currentSessionId)
  const projectId = useSessionStore((s) => {
    if (!s.currentSessionId) return null
    return s.sessions.find((row) => row.id === s.currentSessionId)?.projectId ?? null
  })
  const messages = useSessionStore((s) => {
    const sessionId = s.currentSessionId
    if (!sessionId) return EMPTY_MESSAGES
    return s.messagesBySession[sessionId] ?? EMPTY_MESSAGES
  })
  const refreshPreview = useCodeStore((s) => s.refreshPreview)

  const disabled = refreshing || !currentSessionId || !projectId

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!currentSessionId || !projectId || refreshing) return
        setRefreshing(true)
        void refreshPreview(currentSessionId, projectId, messages).finally(() => {
          setRefreshing(false)
        })
      }}
      aria-label="刷新预览"
      title="刷新预览"
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700",
        "transition-colors hover:bg-slate-100 hover:text-slate-900",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <RefreshCw className={cn("h-4 w-4 shrink-0", refreshing ? "animate-spin" : "")} strokeWidth={2} aria-hidden />
      刷新预览
    </button>
  )
}
