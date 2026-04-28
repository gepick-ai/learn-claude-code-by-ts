import { useEffect, useId, useRef } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/cn"

export type DeleteSessionConfirmDialogProps = {
  open: boolean
  sessionTitle: string
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteSessionConfirmDialog({
  open,
  sessionTitle,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteSessionConfirmDialogProps) {
  const titleId = useId()
  const descId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => cancelRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) onCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, isDeleting, onCancel])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === "undefined") return null

  const label = sessionTitle.trim() || "无标题"

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 motion-reduce:transition-none"
      role="presentation"
    >
      <button
        type="button"
        aria-label="关闭对话框"
        disabled={isDeleting}
        className={cn(
          "absolute inset-0 z-0 cursor-pointer border-0 bg-slate-900/45 transition-opacity duration-200",
          "motion-reduce:transition-none",
          "disabled:cursor-not-allowed",
        )}
        onClick={() => {
          if (!isDeleting) onCancel()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          "relative z-10 w-full max-w-[min(100%,20rem)] rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10",
          "motion-reduce:transition-none",
        )}
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-200/80"
              aria-hidden
            >
              <AlertTriangle className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 pt-0.5">
              <h2 id={titleId} className="text-sm font-semibold text-slate-900">
                删除会话
              </h2>
              <p id={descId} className="mt-1 text-sm leading-relaxed text-slate-600">
                确定永久删除「<span className="font-medium text-slate-800">{label}</span>
                」？聊天记录将一并删除且<strong className="font-medium text-slate-800">不可恢复</strong>。
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 px-4 py-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className={cn(
              "cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700",
              "transition-colors duration-200 hover:bg-slate-50 motion-reduce:transition-none",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            取消
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className={cn(
              "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white",
              "bg-rose-600 transition-colors duration-200 hover:bg-rose-700 motion-reduce:transition-none",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60 focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
                删除中…
              </>
            ) : (
              "删除"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
