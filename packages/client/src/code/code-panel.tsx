import { useEffect, useMemo, useState } from "react"
import { RotateCcw } from "lucide-react"
import { useSessionStore } from "@/session/session-store"
import { cn } from "@/util/cn"
import { useCodeStore } from "./code-store"

const EMPTY_MESSAGES: ReturnType<typeof useSessionStore.getState>["messagesBySession"][string] = []

export function CodePanel() {
  const [reloadSeed, setReloadSeed] = useState(0)
  const currentSessionId = useSessionStore((s) => s.currentSessionId)
  const messages = useSessionStore((s) => {
    const sessionId = s.currentSessionId
    if (!sessionId) return EMPTY_MESSAGES
    return s.messagesBySession[sessionId] ?? EMPTY_MESSAGES
  })
  const syncFromMessages = useCodeStore((s) => s.syncFromMessages)
  const html = useCodeStore((s) => (currentSessionId ? s.generatedHtmlBySession[currentSessionId] ?? "" : ""))
  const status = useCodeStore((s) =>
    currentSessionId ? (s.codePanelStatusBySession[currentSessionId] ?? "empty") : "empty",
  )
  const error = useCodeStore((s) => (currentSessionId ? s.codePanelErrorBySession[currentSessionId] : undefined))

  useEffect(() => {
    if (!currentSessionId) return
    syncFromMessages(currentSessionId, messages)
  }, [currentSessionId, messages, syncFromMessages])

  const frameKey = useMemo(() => `${currentSessionId ?? "none"}:${reloadSeed}:${html.length}`, [currentSessionId, html, reloadSeed])

  return (
    <aside
      className={cn(
        "flex h-full w-full min-h-0 min-w-0 flex-col border-r border-slate-200 bg-white",
        "text-sm text-slate-600",
      )}
      aria-label="代码业务区域"
    >
      <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">Code</div>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700",
            "hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
          )}
          onClick={() => setReloadSeed((v) => v + 1)}
          disabled={status !== "ready"}
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          重新加载
        </button>
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {status === "ready" ? (
          <iframe
            key={frameKey}
            className="h-full w-full border-0"
            srcDoc={html}
            sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
            title="代码运行区"
          />
        ) : null}
        {status === "empty" ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
            发送需求后，助手生成的 HTML 会在这里运行。
          </div>
        ) : null}
        {status === "error" ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-600">
            {error ?? "HTML 提取失败，请让助手输出完整 HTML 后重试。"}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
