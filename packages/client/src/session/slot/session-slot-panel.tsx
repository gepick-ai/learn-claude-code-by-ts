import { CodePanel } from "@/code"

/** 约束 slot 高度随网格行传递，避免子内容把整页撑高导致外层滚动 */
export function SessionSlotPanel() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <CodePanel />
    </div>
  )
}

