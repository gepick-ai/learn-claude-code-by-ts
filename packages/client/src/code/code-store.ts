import { create } from "zustand"
import type { SessionMessage } from "@gepick/sdk"
import { buildCodeViewModel } from "./build-code-view-model"

export type CodePanelStatus = "empty" | "ready" | "error"

type CodeState = {
  generatedHtmlBySession: Record<string, string>
  codePanelStatusBySession: Record<string, CodePanelStatus>
  codePanelErrorBySession: Record<string, string | undefined>
  syncFromMessages: (sessionId: string, messages: SessionMessage[]) => void
}

export const useCodeStore = create<CodeState>()((set) => ({
  generatedHtmlBySession: {},
  codePanelStatusBySession: {},
  codePanelErrorBySession: {},
  syncFromMessages: (sessionId, messages) => {
    const vm = buildCodeViewModel(messages)
    if (vm.status === "pending") return
    if (vm.status === "ready") {
      set((st) => ({
        generatedHtmlBySession: { ...st.generatedHtmlBySession, [sessionId]: vm.html },
        codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "ready" },
        codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: undefined },
      }))
      return
    }
    if (vm.status === "error") {
      set((st) => ({
        codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "error" },
        codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: vm.error },
      }))
      return
    }
    set((st) => ({
      generatedHtmlBySession: { ...st.generatedHtmlBySession, [sessionId]: "" },
      codePanelStatusBySession: { ...st.codePanelStatusBySession, [sessionId]: "empty" },
      codePanelErrorBySession: { ...st.codePanelErrorBySession, [sessionId]: undefined },
    }))
  },
}))
