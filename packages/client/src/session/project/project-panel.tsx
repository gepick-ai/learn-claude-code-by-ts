import { Loader2, Plus } from "lucide-react"
import { useSessionStore } from "../session-store"
import { ProjectListItem } from "./project-list-item"
import { cn } from "@/util/cn"

export function ProjectPanel() {
  const {
    projects,
    currentProjectId,
    listLoading,
    hydrated,
    createNewProject,
    selectProject,
  } = useSessionStore()

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white",
        "shadow-sm shadow-slate-200/50",
      )}
      aria-label="项目列表"
    >
      <div className="shrink-0 border-b border-slate-200 px-3 py-3">
        <button
          type="button"
          onClick={() => {
            void createNewProject()
          }}
          disabled={listLoading || !hydrated}
          className={cn(
            "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5",
            "bg-slate-900 text-sm font-medium text-white",
            "transition-colors duration-200 hover:bg-slate-800",
            "focus:outline-none focus:ring-2 focus:ring-slate-500/60 focus:ring-offset-2 focus:ring-offset-white",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {listLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={2} aria-hidden />
          ) : (
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          )}
          新建 Project
        </button>
      </div>
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
        {!hydrated || listLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            加载中…
          </div>
        ) : projects.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm leading-relaxed text-slate-500">
            尚无 Project。点击「新建 Project」开始。
          </p>
        ) : (
          projects.map((p) => (
            <ProjectListItem
              key={p.id}
              id={p.id}
              name={p.name}
              isActive={p.id === currentProjectId}
              onSelect={(id) => {
                void selectProject(id)
              }}
            />
          ))
        )}
      </nav>
    </aside>
  )
}

