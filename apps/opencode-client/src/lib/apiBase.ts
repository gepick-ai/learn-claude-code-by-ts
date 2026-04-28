/**
 * 仅开发：在 `.env.local` 中设置 `VITE_OPENCODE_DEV_API_ORIGIN`（如 `http://127.0.0.1:3000`）时，
 * 与 `OPENCODE_APP_ORIGIN` 使用同一 opencode-app，使 `fetch` / `EventSource` 直连该 origin，
 * 避免 Vite 的 Node `http-proxy` 对长流式 `POST /session/.../message` 报 `socket hang up`。
 * 生产环境始终为相对路径（同源由网关/Hono 托管保证）。
 */
export function apiBase(): string {
  if (!import.meta.env.DEV) return ""
  const raw = import.meta.env.VITE_OPENCODE_DEV_API_ORIGIN
  if (typeof raw === "string" && raw.trim()) return raw.replace(/\/+$/, "")
  return ""
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  const b = apiBase()
  return b ? `${b}${p}` : p
}
