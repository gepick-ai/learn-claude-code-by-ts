import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: (string | undefined | false)[]) {
  return twMerge(clsx(inputs))
}

export default function App() {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col items-center justify-center gap-2",
        "bg-slate-950 text-slate-100",
      )}
    >
      <h1 className="text-xl font-medium">opencode-client</h1>
      <p className="text-sm text-slate-400">Vite + React + Tailwind v4 已就绪</p>
    </div>
  )
}
