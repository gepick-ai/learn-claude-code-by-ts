import { create } from "zustand"
import type { SessionMessage } from "@gepick/sdk"
import { buildFallbackCodeViewModelFromMessages } from "./build-code-view-model"
import { fetchWorkspacePreviewHtml } from "./fetch-project-preview"

/** 开启后：工作区无入口文件时回退从聊天正文抽 HTML（开发调试用，易与磁盘不一致）。 */
const CODE_PREVIEW_CHAT_FALLBACK =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_CODE_PREVIEW_CHAT_FALLBACK === "true"

export type CodePanelStatus = "empty" | "ready" | "error"

export type PreviewSourceLabel = "workspace" | "chat-fallback" | null

type CodeState = {
  generatedHtmlBySession: Record<string, string>
  codePanelStatusBySession: Record<string, CodePanelStatus>
  codePanelErrorBySession: Record<string, string | undefined>
  previewSourceBySession: Record<string, PreviewSourceLabel>
  workspaceMissingBySession: Record<string, boolean | undefined>
  refreshPreview: (
    sessionId: string,
    projectId: string | null | undefined,
    messages: SessionMessage[],
  ) => Promise<void>
}

/** 同一 session 并发 refresh 时丢弃过期结果 */
const refreshTokens: Record<string, number> = {}

export const useCodeStore = create<CodeState>()((set) => ({
  generatedHtmlBySession: {},
  codePanelStatusBySession: {},
  codePanelErrorBySession: {},
  previewSourceBySession: {},
  workspaceMissingBySession: {},

  refreshPreview: async (sessionId, projectId, messages) => {
    const token = (refreshTokens[sessionId] = (refreshTokens[sessionId] ?? 0) + 1)

    if (!projectId) {
      set((st) => ({
        generatedHtmlBySession: { ...st.generatedHtmlBySession, [sessionId]: "" },
        codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "empty" },
        codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: undefined },
        previewSourceBySession: { ...st.previewSourceBySession, [sessionId]: null },
        workspaceMissingBySession: { ...st.workspaceMissingBySession, [sessionId]: false },
      }))
      return
    }

    const disk = await fetchWorkspacePreviewHtml(projectId)
    if (refreshTokens[sessionId] !== token) return

    if (disk.ok) {
      set((st) => ({
        generatedHtmlBySession: { ...st.generatedHtmlBySession, [sessionId]: disk.html },
        codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "ready" },
        codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: undefined },
        previewSourceBySession: { ...st.previewSourceBySession, [sessionId]: "workspace" },
        workspaceMissingBySession: { ...st.workspaceMissingBySession, [sessionId]: false },
      }))
      return
    }

    if (CODE_PREVIEW_CHAT_FALLBACK) {
      const vm = buildFallbackCodeViewModelFromMessages(messages)
      if (vm.status === "pending") {
        return
      }
      if (vm.status === "ready") {
        set((st) => ({
          generatedHtmlBySession: { ...st.generatedHtmlBySession, [sessionId]: vm.html },
          codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "ready" },
          codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: undefined },
          previewSourceBySession: { ...st.previewSourceBySession, [sessionId]: "chat-fallback" },
          workspaceMissingBySession: { ...st.workspaceMissingBySession, [sessionId]: true },
        }))
        return
      }
      if (vm.status === "error") {
        set((st) => ({
          codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "error" },
          codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: vm.error },
          previewSourceBySession: { ...st.previewSourceBySession, [sessionId]: "chat-fallback" },
          workspaceMissingBySession: { ...st.workspaceMissingBySession, [sessionId]: true },
        }))
        return
      }
    }

    if (disk.kind === "missing") {
      set((st) => ({
        generatedHtmlBySession: { ...st.generatedHtmlBySession, [sessionId]: "" },
        codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "empty" },
        codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: undefined },
        previewSourceBySession: { ...st.previewSourceBySession, [sessionId]: null },
        workspaceMissingBySession: { ...st.workspaceMissingBySession, [sessionId]: true },
      }))
      return
    }

    set((st) => ({
      codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "error" },
      codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: disk.message },
      previewSourceBySession: { ...st.previewSourceBySession, [sessionId]: null },
      workspaceMissingBySession: { ...st.workspaceMissingBySession, [sessionId]: undefined },
    }))
  },
}))
