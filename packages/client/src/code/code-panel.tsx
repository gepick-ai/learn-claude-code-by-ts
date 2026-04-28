import { useEffect, useMemo, useRef } from "react"
import { useSessionStore } from "@/session/session-store"
import { cn } from "@/util/cn"
import { useCodeStore } from "./code-store"

const PREVIEW_DEBOUNCE_MS = 450

const EMPTY_MESSAGES: ReturnType<typeof useSessionStore.getState>["messagesBySession"][string] = []

export function CodePanel() {
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
  const previewEntryUrl = useCodeStore((s) =>
    currentSessionId ? s.previewEntryUrlBySession[currentSessionId] : undefined,
  )
  const html = useCodeStore((s) => (currentSessionId ? s.generatedHtmlBySession[currentSessionId] ?? "" : ""))
  const status = useCodeStore((s) =>
    currentSessionId ? (s.codePanelStatusBySession[currentSessionId] ?? "empty") : "empty",
  )
  const error = useCodeStore((s) => (currentSessionId ? s.codePanelErrorBySession[currentSessionId] : undefined))
  const previewSource = useCodeStore((s) =>
    currentSessionId ? s.previewSourceBySession[currentSessionId] ?? null : null,
  )
  const scopeKey = `${currentSessionId ?? ""}:${projectId ?? ""}`
  const prevScopeKeyRef = useRef("")

  useEffect(() => {
    if (!currentSessionId) return
    const switched = prevScopeKeyRef.current !== scopeKey
    prevScopeKeyRef.current = scopeKey
    const delay = switched ? 0 : PREVIEW_DEBOUNCE_MS
    const id = window.setTimeout(() => {
      void refreshPreview(currentSessionId, projectId, messages)
    }, delay)
    return () => window.clearTimeout(id)
  }, [currentSessionId, projectId, messages, refreshPreview, scopeKey])

  const frameKey = useMemo(
    () =>
      `${currentSessionId ?? "none"}:${previewEntryUrl ?? ""}:${previewEntryUrl ? "" : html.length}`,
    [currentSessionId, html, previewEntryUrl],
  )

  const emptyHint = "发送需求后，助手在工作区生成的页面会在这里运行。"

  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 w-full flex-1 flex-col border-r border-slate-200 bg-white",
        "text-sm text-slate-600",
      )}
      aria-label="代码业务区域"
    >
      {previewSource === "chat-fallback" ? (
        <div className="border-b border-amber-100 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          预览来自聊天正文抽取（工作区缺少 index.html），可能与磁盘不一致。
        </div>
      ) : null}

      <div className="relative min-h-0 min-w-0 flex-1 basis-0 overflow-hidden">
        {status === "ready" && previewEntryUrl ? (
          <iframe
            key={frameKey}
            className="absolute inset-0 box-border h-full w-full max-h-full max-w-full border-0"
            src={previewEntryUrl}
            sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
            title="代码运行区"
          />
        ) : null}
        {status === "ready" && !previewEntryUrl ? (
          <iframe
            key={frameKey}
            className="absolute inset-0 box-border h-full w-full max-h-full max-w-full border-0"
            srcDoc={html}
            sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
            title="代码运行区"
          />
        ) : null}
        {status === "empty" ? (
          <div className="flex h-full min-h-0 items-center justify-center px-6 text-center text-sm text-slate-500">
            {emptyHint}
          </div>
        ) : null}
        {status === "error" ? (
          <div className="flex h-full min-h-0 items-center justify-center px-6 text-center text-sm text-red-600">
            {error ?? "无法加载工作区预览，请稍后重试。"}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
