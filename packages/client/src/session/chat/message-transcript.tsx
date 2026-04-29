import { Bot, Loader2, User, Wrench } from "lucide-react"
import { cn } from "@/util/cn"
import type { Message, Part, SessionMessage } from "@gepick/sdk"
import { MarkdownMessageBody } from "./markdown-message-body"
import { unwrapToolcallDisplayText } from "./unwrap-toolcall-display-text"

function formatAssistantError(error: unknown): string {
  if (!error) return ""
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message || String(error)
  if (typeof error === "object") {
    const rec = error as Record<string, unknown>
    const data = rec.data
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>
      if (typeof d.message === "string" && d.message.trim()) return d.message
      if (typeof d.responseBody === "string" && d.responseBody.trim()) {
        try {
          const parsed = JSON.parse(d.responseBody) as { error?: { message?: string } }
          const m = parsed?.error?.message
          if (typeof m === "string" && m.trim()) return m
        } catch {
          return d.responseBody
        }
      }
    }
    if (typeof rec.message === "string" && rec.message.trim()) return rec.message
    return JSON.stringify(error)
  }
  return String(error)
}

function PartBlock({ part, messageRole }: { part: Part; messageRole: Message["role"] }) {
  if (part.type === "text" && (part.ignored || part.synthetic)) {
    return null
  }
  if (part.type === "text") {
    if (messageRole === "assistant") {
      return <MarkdownMessageBody content={unwrapToolcallDisplayText(part.text)} variant="default" />
    }
    return (
      <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-slate-800">{part.text}</p>
    )
  }
  if (part.type === "reasoning") {
    return <MarkdownMessageBody content={part.text} variant="reasoning" />
  }
  if (part.type === "tool") {
    return (
      <div className="min-w-0 max-w-full overflow-hidden rounded-md border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
        <p className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-amber-900">
          <Wrench className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="min-w-0 break-all">
            {part.tool} · {part.state.status}
          </span>
        </p>
        <pre className="max-h-32 min-w-0 max-w-full overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all wrap-anywhere font-mono text-[11px] text-slate-600">
          {JSON.stringify(part.state, null, 2)}
        </pre>
      </div>
    )
  }
  return null
}

function MessageRow({ sm }: { sm: SessionMessage }) {
  const { message, parts } = sm
  const isUser = message.role === "user"
  return (
    <li
      className={cn("flex min-w-0 max-w-full w-full", isUser ? "justify-end" : "justify-start")}
      data-role={message.role}
    >
      <div
        className={cn(
          "flex min-w-0 w-full max-w-[min(100%,40rem)] gap-2 sm:max-w-2xl",
          isUser ? "flex-row-reverse" : "flex-row",
        )}
      >
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            isUser
              ? "bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200"
              : "bg-slate-200 text-slate-700 ring-1 ring-slate-300/80",
          )}
        >
          {isUser ? <User className="h-4 w-4" strokeWidth={1.75} aria-hidden /> : <Bot className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
        </div>
        <div
          className={cn(
            "min-w-0 max-w-full flex-1 overflow-hidden rounded-2xl px-4 py-2.5",
            isUser
              ? "rounded-tr-sm border border-indigo-200/90 bg-indigo-50/90 shadow-sm"
              : "rounded-tl-sm border-transparent bg-slate-50/80 shadow-none",
          )}
        >
          {message.role === "assistant" && message.error && (
            <p className="mb-1 whitespace-pre-wrap text-sm text-red-600">{formatAssistantError(message.error)}</p>
          )}
          <div className="min-w-0 space-y-2">
            {parts.map((p) => (
              <PartBlock key={p.id} part={p} messageRole={message.role} />
            ))}
          </div>
        </div>
      </div>
    </li>
  )
}

type MessageTranscriptProps = {
  items: SessionMessage[]
  emptyHint: string
  loading: boolean
  /** 已提交用户消息，正等待流式/服务端写回助手回复时显示 */
  assistantPending?: boolean
}

function AssistantPendingRow() {
  return (
    <li className="flex min-w-0 max-w-full w-full justify-start" aria-live="polite" data-role="assistant-pending">
      <div className="flex min-w-0 w-full max-w-[min(100%,40rem)] gap-2 sm:max-w-2xl">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 ring-1 ring-slate-300/80"
        >
          <Bot className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </div>
        <div
          className={cn(
            "min-w-0 max-w-full flex-1 overflow-hidden rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-2.5 shadow-sm",
            "text-sm text-slate-500",
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={1.75} aria-hidden />
            正在生成…
          </span>
        </div>
      </div>
    </li>
  )
}

export function MessageTranscript({ items, emptyHint, loading, assistantPending }: MessageTranscriptProps) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden />
        加载消息
      </div>
    )
  }
  if (items.length === 0 && !assistantPending) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm leading-relaxed text-slate-500">
        {emptyHint}
      </div>
    )
  }
  return (
    <ol className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-4 list-none" aria-label="消息列表">
      {items.map((sm) => (
        <MessageRow key={sm.message.id} sm={sm} />
      ))}
      {assistantPending ? <AssistantPendingRow key="__pending" /> : null}
    </ol>
  )
}
