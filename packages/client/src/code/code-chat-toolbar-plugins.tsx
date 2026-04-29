import { ChatToolbarCodeSlotRegistration } from "@/session/chat"
import { ExternalPreviewToolbarButton } from "./external-preview-toolbar-button"
import { RefreshPreviewToolbarButton } from "./refresh-preview-toolbar-button"

export function CodeChatToolbarPlugins() {
  return (
    <>
      <ChatToolbarCodeSlotRegistration id="code.refresh-preview" priority={90} node={<RefreshPreviewToolbarButton />} />
      <ChatToolbarCodeSlotRegistration id="code.external-preview" priority={100} node={<ExternalPreviewToolbarButton />} />
    </>
  )
}
