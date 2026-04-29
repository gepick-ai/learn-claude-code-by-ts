import { create } from "zustand"
import type { SessionMessage } from "@gepick/sdk"
import { buildFallbackCodeViewModelFromMessages } from "./build-code-view-model"
import {
  buildWorkspacePreviewEntryUrl,
  fetchWorkspacePreviewHtml,
  previewGatewayReachable,
} from "./workspace-preview"

/** 开启后：工作区无入口文件时回退从聊天正文抽 HTML（开发调试用，易与磁盘不一致）。 */
const CODE_PREVIEW_CHAT_FALLBACK =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_CODE_PREVIEW_CHAT_FALLBACK === "true"

export type CodePanelStatus = "empty" | "loading" | "ready" | "error"

export type PreviewSourceLabel = "workspace" | "chat-fallback" | null

type CodeState = {
  generatedHtmlBySession: Record<string, string>
  /** Code v3：存在时 iframe 使用 `src` 指向预览网关；与 `generatedHtmlBySession` 互斥展示。 */
  previewEntryUrlBySession: Record<string, string | undefined>
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

function shouldShowLoadingForMissing(messages: SessionMessage[]): boolean {
  if (messages.length === 0) return true
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i]
    if (msg?.message.role !== "assistant") continue
    for (const part of msg.parts) {
      if (part.type !== "tool") continue
      const statusRaw = part.state?.status
      const status = typeof statusRaw === "string" ? statusRaw.toLowerCase() : ""
      if (status === "pending" || status === "running" || status === "in_progress") {
        return true
      }
    }
  }
  let lastUserIdx = -1
  let lastAssistantIdx = -1
  for (let i = 0; i < messages.length; i += 1) {
    const role = messages[i]?.message.role
    if (role === "user") lastUserIdx = i
    if (role === "assistant") lastAssistantIdx = i
  }
  return lastUserIdx > lastAssistantIdx
}

export const useCodeStore = create<CodeState>()((set) => ({
  generatedHtmlBySession: {},
  previewEntryUrlBySession: {},
  codePanelStatusBySession: {},
  codePanelErrorBySession: {},
  previewSourceBySession: {},
  workspaceMissingBySession: {},

  refreshPreview: async (sessionId, projectId, messages) => {
    const token = (refreshTokens[sessionId] = (refreshTokens[sessionId] ?? 0) + 1)

    if (!projectId) {
      set((st) => ({
        generatedHtmlBySession: { ...st.generatedHtmlBySession, [sessionId]: "" },
        previewEntryUrlBySession: { ...st.previewEntryUrlBySession, [sessionId]: undefined },
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
      const bust = Date.now()
      const previewUrl = buildWorkspacePreviewEntryUrl(projectId, bust)
      const useGateway = await previewGatewayReachable(previewUrl)
      if (refreshTokens[sessionId] !== token) return

      set((st) => ({
        generatedHtmlBySession: {
          ...st.generatedHtmlBySession,
          [sessionId]: useGateway ? "" : disk.html,
        },
        previewEntryUrlBySession: {
          ...st.previewEntryUrlBySession,
          [sessionId]: useGateway ? previewUrl : undefined,
        },
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
        set((st) => ({
          generatedHtmlBySession: { ...st.generatedHtmlBySession, [sessionId]: "" },
          previewEntryUrlBySession: { ...st.previewEntryUrlBySession, [sessionId]: undefined },
          codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "loading" },
          codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: undefined },
          previewSourceBySession: { ...st.previewSourceBySession, [sessionId]: "chat-fallback" },
          workspaceMissingBySession: { ...st.workspaceMissingBySession, [sessionId]: true },
        }))
        return
      }
      if (vm.status === "ready") {
        set((st) => ({
          generatedHtmlBySession: { ...st.generatedHtmlBySession, [sessionId]: vm.html },
          previewEntryUrlBySession: { ...st.previewEntryUrlBySession, [sessionId]: undefined },
          codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "ready" },
          codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: undefined },
          previewSourceBySession: { ...st.previewSourceBySession, [sessionId]: "chat-fallback" },
          workspaceMissingBySession: { ...st.workspaceMissingBySession, [sessionId]: true },
        }))
        return
      }
      if (vm.status === "error") {
        set((st) => ({
          generatedHtmlBySession: { ...st.generatedHtmlBySession, [sessionId]: "" },
          previewEntryUrlBySession: { ...st.previewEntryUrlBySession, [sessionId]: undefined },
          codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "error" },
          codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: vm.error },
          previewSourceBySession: { ...st.previewSourceBySession, [sessionId]: "chat-fallback" },
          workspaceMissingBySession: { ...st.workspaceMissingBySession, [sessionId]: true },
        }))
        return
      }
    }

    if (disk.kind === "missing") {
      const shouldLoading = shouldShowLoadingForMissing(messages)
      set((st) => ({
        generatedHtmlBySession: { ...st.generatedHtmlBySession, [sessionId]: "" },
        previewEntryUrlBySession: { ...st.previewEntryUrlBySession, [sessionId]: undefined },
        codePanelStatusBySession: {
          ...st.codePanelStatusBySession,
          [sessionId]: shouldLoading ? "loading" : "empty",
        },
        codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: undefined },
        previewSourceBySession: { ...st.previewSourceBySession, [sessionId]: null },
        workspaceMissingBySession: { ...st.workspaceMissingBySession, [sessionId]: true },
      }))
      return
    }

    set((st) => ({
      generatedHtmlBySession: { ...st.generatedHtmlBySession, [sessionId]: "" },
      codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "error" },
      codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: disk.message },
      previewSourceBySession: { ...st.previewSourceBySession, [sessionId]: null },
      workspaceMissingBySession: { ...st.workspaceMissingBySession, [sessionId]: undefined },
      previewEntryUrlBySession: { ...st.previewEntryUrlBySession, [sessionId]: undefined },
    }))
  },
}))
