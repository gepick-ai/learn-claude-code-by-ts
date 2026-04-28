import { ChatToolbarCodeSlotRegistration } from "@/session/chat"
import { ExternalPreviewToolbarButton } from "./external-preview-toolbar-button"

export function CodeChatToolbarPlugins() {
  return (
    <ChatToolbarCodeSlotRegistration
      id="code.external-preview"
      priority={100}
      node={<ExternalPreviewToolbarButton />}
    />
  )
}
