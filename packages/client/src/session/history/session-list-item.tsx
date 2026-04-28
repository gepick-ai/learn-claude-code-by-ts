import { Loader2, MessageSquare, Trash2 } from "lucide-react"
import { cn } from "@/util/cn"

type SessionListItemProps = {
  id: string
  title: string
  isActive: boolean
  isDeleting?: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function SessionListItem({
  id,
  title,
  isActive,
  isDeleting = false,
  onSelect,
  onDelete,
}: SessionListItemProps) {
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-0.5 rounded-lg transition-colors duration-200",
        isActive
          ? "bg-indigo-100 ring-1 ring-indigo-400/40"
          : "hover:bg-slate-100",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(id)}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm",
          isActive ? "text-indigo-950" : "text-slate-700 hover:text-slate-900",
        )}
      >
        <MessageSquare
          className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-700" : "text-slate-400")}
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="min-w-0 flex-1 wrap-break-word text-left font-medium leading-snug line-clamp-2">
          {title || "无标题"}
        </span>
      </button>
      <button
        type="button"
        disabled={isDeleting}
        aria-label="删除会话"
        title="删除会话"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(id)
        }}
        className={cn(
          "mr-1.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md",
          "text-slate-400 opacity-0 transition-[color,background-color,opacity] duration-200",
          "group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100",
          "focus:opacity-100 focus:outline-none",
          "focus-visible:ring-2 focus-visible:ring-indigo-500/45 focus-visible:ring-offset-2",
          !isActive && [
            "focus-visible:ring-offset-white",
            "hover:bg-slate-200/90 hover:text-slate-700",
          ],
          isActive && [
            "focus-visible:ring-offset-indigo-100",
            "hover:bg-indigo-200/55 hover:text-indigo-900",
          ],
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        {isDeleting ? (
          <Loader2
            className={cn("h-4 w-4 animate-spin", isActive ? "text-indigo-600" : "text-slate-500")}
            strokeWidth={2}
            aria-hidden
          />
        ) : (
          <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        )}
      </button>
    </div>
  )
}
