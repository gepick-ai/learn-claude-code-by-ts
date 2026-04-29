import { sdk } from "@/util/sdk"

/** Code v4：相对项目工作区根，仅预览 `client` 构建产物（与 app 设计稿一致）。 */
export const WORKSPACE_PREVIEW_ENTRY = "client/dist/index.html"

export type WorkspacePreviewFetchResult =
  | { ok: true; html: string }
  | { ok: false; kind: "missing" | "failed"; message: string }

function parseErrorLike(input: unknown): { status?: number; message: string } {
  if (input instanceof Error) {
    return { message: input.message || "unknown error" }
  }
  if (input && typeof input === "object") {
    const rec = input as Record<string, unknown>
    const statusRaw = rec.status
    const status =
      typeof statusRaw === "number"
        ? statusRaw
        : typeof statusRaw === "string" && /^\d+$/.test(statusRaw)
          ? Number(statusRaw)
          : undefined
    const messageCandidates = [rec.message, rec.error, rec.detail]
    for (const candidate of messageCandidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return { status, message: candidate.trim() }
      }
    }
    return { status, message: JSON.stringify(input) }
  }
  return { message: String(input) }
}

/**
 * Code v3：iframe 使用的受控预览 URL（与 `/project/:id/preview/*` 一致）。
 * **始终使用当前站点相对路径**（开发环境走 Vite `server.proxy` 与 `@gepick/app` 同源），
 * 避免写死 `http://127.0.0.1:3000` 导致与页面不同源、预览子资源/CORS/`fetch` 探测异常。
 * `cacheKey` 用于 bust 缓存并强制 iframe 重载。
 */
export function buildWorkspacePreviewEntryUrl(projectId: string, cacheKey?: string | number): string {
  const rel = WORKSPACE_PREVIEW_ENTRY.split("/").map(encodeURIComponent).join("/")
  const base = `/project/${encodeURIComponent(projectId)}/preview/${rel}`
  if (cacheKey === undefined || cacheKey === "") return base
  const sep = base.includes("?") ? "&" : "?"
  return `${base}${sep}v=${encodeURIComponent(String(cacheKey))}`
}

/**
 * Code v3：对即将作为 iframe `src` 的预览 URL 做一次 GET 探测。
 * 若服务端未部署预览路由（旧 `@gepick/app`）或其它原因返回非 2xx，则调用方应退回 `srcDoc`，
 * 避免 iframe 内出现整页「404 Not Found」。
 */
export async function previewGatewayReachable(previewUrl: string): Promise<boolean> {
  try {
    const res = await fetch(previewUrl, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * 探测工作区是否存在可读入口 HTML（仍走 v2 只读文本 API）。
 * v3 下在 `ok` 时用 `buildWorkspacePreviewEntryUrl` 加载 iframe，本函数返回的正文可不用于展示。
 */
export async function fetchWorkspacePreviewHtml(projectId: string): Promise<WorkspacePreviewFetchResult> {
  try {
    const html = await sdk.project.readWorkspaceFile({
      projectId,
      path: WORKSPACE_PREVIEW_ENTRY,
    })
    if (typeof html !== "string") {
      return { ok: false, kind: "failed", message: "无效的预览响应" }
    }
    return { ok: true, html }
  } catch (e) {
    const parsed = parseErrorLike(e)
    const msg = parsed.message
    if (parsed.status === 404 || /404|not\s*found|file\s*not\s*found/i.test(msg)) {
      return {
        ok: false,
        kind: "missing",
        message: "尚未生成预览：请在 `client/` 下执行 `npm install` 与 `npm run build`，以产出 `client/dist/index.html`。",
      }
    }
    return { ok: false, kind: "failed", message: msg }
  }
}
