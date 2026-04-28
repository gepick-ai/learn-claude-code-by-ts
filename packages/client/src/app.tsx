import { CodeChatToolbarPlugins } from "@/code"
import { ChatToolbarCodeSlotProvider } from "@/session/chat"
import { SessionPage } from "@/session/session-page"

export default function App() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <ChatToolbarCodeSlotProvider>
        <CodeChatToolbarPlugins />
        <SessionPage />
      </ChatToolbarCodeSlotProvider>
    </div>
  )
}
