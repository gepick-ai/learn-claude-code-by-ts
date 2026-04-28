import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { useSessionStore } from "../session-store"
import { SessionHistoryContent } from "./session-history-content"
import { acquireBodyScrollLock, releaseBodyScrollLock } from "@/util/body-scroll-lock"
import { cn } from "@/util/cn"

export function SessionHistoryDrawer() {
  const open = useSessionStore((s) => s.sessionHistoryOpen)
  const setSessionHistoryOpen = useSessionStore((s) => s.setSessionHistoryOpen)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const closeDrawer = useCallback(() => {
    setDeleteDialogOpen(false)
    setSessionHistoryOpen(false)
  }, [setSessionHistoryOpen])

  useEffect(() => {
    if (!open) return
    acquireBodyScrollLock()
    return () => {
      releaseBodyScrollLock()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (deleteDialogOpen) return
      closeDrawer()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, deleteDialogOpen, closeDrawer])

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 motion-reduce:transition-none",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="关闭会话历史"
        disabled={!open}
        className={cn(
          "absolute inset-0 z-0 cursor-pointer border-0 transition-opacity duration-200 motion-reduce:transition-none",
          open ? "bg-slate-900/45 opacity-100" : "bg-slate-900/0 opacity-0",
        )}
        onClick={closeDrawer}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 z-10 flex h-full min-h-0 w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden border-l border-slate-200 bg-white",
          "shadow-lg shadow-slate-900/10 transition-transform duration-300 ease-out motion-reduce:transition-none",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-label="会话历史"
        aria-modal="true"
        role="dialog"
        {...(open ? { "aria-hidden": false as const } : { "aria-hidden": true as const })}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2.5">
          <h2 className="text-sm font-semibold text-slate-900">会话历史</h2>
          <button
            type="button"
            aria-label="关闭"
            onClick={closeDrawer}
            className={cn(
              "rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50",
            )}
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <SessionHistoryContent key={open ? "open" : "closed"} onDeleteDialogOpenChange={setDeleteDialogOpen} />
      </aside>
    </div>,
    document.body,
  )
}
