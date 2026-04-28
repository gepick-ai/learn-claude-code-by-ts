import { sdk } from "@/util/sdk"

/** 与服务端 Code v2 默认预览入口一致（相对项目根）。 */
export const WORKSPACE_PREVIEW_ENTRY = "index.html"

export type WorkspacePreviewFetchResult =
  | { ok: true; html: string }
  | { ok: false; kind: "missing" | "failed"; message: string }

/**
 * 从服务端工作区拉取预览 HTML（受控只读 API），与 Agent 落盘目录一致。
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
    const msg = e instanceof Error ? e.message : String(e)
    if (/404|not\s*found|file\s*not\s*found/i.test(msg)) {
      return {
        ok: false,
        kind: "missing",
        message: "工作区暂无 index.html，或文件尚未生成。",
      }
    }
    return { ok: false, kind: "failed", message: msg }
  }
}
