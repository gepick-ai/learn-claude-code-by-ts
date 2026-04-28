import { useEffect, useRef } from "react"
import { hasVisibleAssistantStreamContent } from "./assistant-visibility"
import { useSessionStore } from "../session-store"
import type { SessionMessage } from "@gepick/sdk"
import { MessageTranscript } from "./message-transcript"
import { MessageComposer } from "./message-composer"
import { cn } from "@/util/cn"

/** Zustand selector 必须对「无消息」返回**稳定**引用，否则 `[]` 每次新建引用会触发无限重渲染。 */
const EMPTY_MESSAGES: SessionMessage[] = []

export function SessionChatPanel() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const currentSessionId = useSessionStore((s) => s.currentSessionId)
  const messageLoading = useSessionStore((s) => s.messageLoading)
  const sendLoading = useSessionStore((s) => s.sendLoading)
  const messages = useSessionStore((s) => {
    const id = s.currentSessionId
    if (!id) return EMPTY_MESSAGES
    return s.messagesBySession[id] ?? EMPTY_MESSAGES
  })
  const sendUserText = useSessionStore((s) => s.sendUserText)

  const canSend = Boolean(currentSessionId) && !messageLoading

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [currentSessionId, messages, messageLoading, sendLoading])

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/80"
      aria-label="当前会话"
    >
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-sm font-medium text-slate-800">对话</h1>
        {currentSessionId && (
          <p className="mt-0.5 truncate font-mono text-xs text-slate-500" title={currentSessionId}>
            {currentSessionId}
          </p>
        )}
      </header>

      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-4",
          "scroll-smooth [scrollbar-gutter:stable]",
        )}
      >
        <MessageTranscript
          items={messages}
          loading={messageLoading}
          assistantPending={sendLoading && !hasVisibleAssistantStreamContent(messages)}
          emptyHint={
            currentSessionId
              ? "此会话还没有消息。在下方输入并发送，开始与助手对话。"
              : "在右侧选择会话或「新建会话」后，可在此与助手交流。"
          }
        />
      </div>

      <MessageComposer
        disabled={!canSend}
        sending={sendLoading}
        onSend={(t) => {
          void sendUserText(t)
        }}
      />
    </div>
  )
}
