import { useState, useCallback, useRef, type KeyboardEvent } from "react"
import { Loader2, SendHorizontal } from "lucide-react"
import { cn } from "@/util/cn"

type MessageComposerProps = {
  disabled: boolean
  sending: boolean
  onSend: (text: string) => void
}

export function MessageComposer({ disabled, sending, onSend }: MessageComposerProps) {
  const [value, setValue] = useState("")
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  const submit = useCallback(() => {
    if (disabled || sending) return
    onSend(value)
    setValue("")
    requestAnimationFrame(() => taRef.current?.focus())
  }, [disabled, sending, onSend, value])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      submit()
    }
  }

  const canSend = !disabled && !sending && value.trim().length > 0

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-2.5">
      <div className="mx-auto w-full max-w-3xl">
        <label htmlFor="session-composer" className="sr-only">
          给助手发消息
        </label>
        <div
          className={cn(
            "flex min-h-[5.75rem] flex-col overflow-hidden",
            "rounded-2xl border bg-slate-50/80",
            "shadow-[0_1px_0_0_rgba(15,23,42,0.04)]",
            "transition-[border-color,box-shadow,ring] duration-200",
            "focus-within:ring-1 focus-within:ring-offset-0",
            sending
              ? "border-slate-200/50 focus-within:border-slate-300/50 focus-within:ring-slate-200/35"
              : canSend
                ? "border-indigo-500/55 focus-within:border-indigo-500/90 focus-within:ring-indigo-500/25"
                : "border-slate-200/50 focus-within:border-indigo-400/50 focus-within:ring-indigo-200/45",
            disabled && "pointer-events-none opacity-50",
          )}
          aria-busy={sending}
        >
          <textarea
            ref={taRef}
            id="session-composer"
            name="message"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled || sending}
            placeholder={disabled ? "请先创建或选择会话" : "输入消息，Enter 换行；点发送，或 Ctrl+Enter / ⌘+Enter 发送"}
            className={cn(
              "min-h-[3.25rem] max-h-40 flex-1 resize-none",
              "border-0 border-transparent bg-transparent",
              "px-3 pb-0.5 pt-2.5",
              "text-sm leading-relaxed text-slate-800 placeholder:text-slate-400",
              "focus:outline-none focus:ring-0",
              "disabled:cursor-not-allowed",
            )}
            rows={2}
          />
          <div
            className="flex items-center justify-end gap-2.5 border-t border-slate-200/35 px-2 pb-1.5 pt-1"
            aria-live="polite"
          >
            {sending && (
              <Loader2
                className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400"
                strokeWidth={1.25}
                aria-hidden
              />
            )}
            {sending ? (
              <button
                type="button"
                disabled
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center",
                  "rounded-full bg-slate-800 text-white shadow-sm",
                  "cursor-not-allowed opacity-95",
                )}
                title="正在生成，请稍候"
                aria-label="正在生成"
              >
                <span className="h-2 w-2 rounded-[1px] bg-white" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={disabled || !value.trim()}
                aria-label="发送"
                className={cn(
                  "inline-flex h-9 w-9 cursor-pointer items-center justify-center",
                  "rounded-full bg-slate-800 text-white",
                  "shadow-sm transition-[background-color,transform,opacity] duration-200",
                  "hover:bg-slate-900 active:scale-[0.98]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800",
                  "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-slate-800",
                )}
              >
                <SendHorizontal className="h-4 w-4 -translate-y-px" strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
