import { ExternalLink } from "lucide-react"
import { useSessionStore } from "@/session/session-store"
import { cn } from "@/util/cn"
import { useCodeStore } from "./code-store"

export function ExternalPreviewToolbarButton() {
  const currentSessionId = useSessionStore((s) => s.currentSessionId)
  const previewEntryUrl = useCodeStore((s) =>
    currentSessionId ? s.previewEntryUrlBySession[currentSessionId] : undefined,
  )

  const disabled = !currentSessionId || !previewEntryUrl

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!previewEntryUrl) return
        window.open(previewEntryUrl, "_blank", "noopener,noreferrer")
      }}
      aria-label="外部预览"
      title="外部预览"
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700",
        "transition-colors hover:bg-slate-100 hover:text-slate-900",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      外部预览
    </button>
  )
}
