import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/cn"

type SessionListItemProps = {
  id: string
  title: string
  isActive: boolean
  onSelect: (id: string) => void
}

export function SessionListItem({ id, title, isActive, onSelect }: SessionListItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-200",
        isActive
          ? "bg-indigo-100 text-indigo-950 ring-1 ring-indigo-400/40"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <MessageSquare
        className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-700" : "text-slate-400")}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate font-medium">{title || "无标题"}</span>
    </button>
  )
}
