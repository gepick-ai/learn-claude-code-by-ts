import { cn } from "@/util/cn"

export function SessionSlotPanel() {
  return (
    <aside
      className={cn(
        "flex h-full w-full min-h-0 min-w-0 items-center justify-center border-r border-slate-200 bg-white",
        "text-sm text-slate-500",
      )}
      aria-label="业务区域"
    >
      <span>业务区域</span>
    </aside>
  )
}

