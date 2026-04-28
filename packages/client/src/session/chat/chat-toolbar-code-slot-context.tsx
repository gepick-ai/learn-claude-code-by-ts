import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

type RegisteredPlugin = {
  id: string
  node: ReactNode
  priority: number
  order: number
}

type RegisterPluginInput = {
  id: string
  node: ReactNode
  priority?: number
}

type ChatToolbarCodeSlotContextValue = {
  registerPlugin: (plugin: RegisterPluginInput) => () => void
  plugins: Array<{ id: string; node: ReactNode }>
}

const DEFAULT_PRIORITY = 100

const ChatToolbarCodeSlotContext = createContext<ChatToolbarCodeSlotContextValue | null>(null)

export function ChatToolbarCodeSlotProvider({ children }: { children: ReactNode }) {
  const orderRef = useRef(0)
  const [plugins, setPlugins] = useState<RegisteredPlugin[]>([])

  const registerPlugin = useCallback((plugin: RegisterPluginInput) => {
    const order = orderRef.current++
    const priority = plugin.priority ?? DEFAULT_PRIORITY

    setPlugins((prev) => [
      ...prev.filter((p) => p.id !== plugin.id),
      { id: plugin.id, node: plugin.node, priority, order },
    ])

    return () => {
      setPlugins((prev) => prev.filter((p) => p.id !== plugin.id))
    }
  }, [])

  const value = useMemo<ChatToolbarCodeSlotContextValue>(() => {
    const orderedNodes = plugins
      .slice()
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.order - b.order
      })
      .map((plugin) => ({ id: plugin.id, node: plugin.node }))

    return {
      registerPlugin,
      plugins: orderedNodes,
    }
  }, [plugins, registerPlugin])

  return <ChatToolbarCodeSlotContext.Provider value={value}>{children}</ChatToolbarCodeSlotContext.Provider>
}

function useChatToolbarCodeSlotContext() {
  const ctx = useContext(ChatToolbarCodeSlotContext)
  if (!ctx) {
    throw new Error("useChatToolbarCodeSlotContext must be used within ChatToolbarCodeSlotProvider")
  }
  return ctx
}

export function ChatToolbarCodeSlot() {
  const { plugins } = useChatToolbarCodeSlotContext()
  return (
    <>
      {plugins.map((plugin) => (
        <div key={plugin.id} className="inline-flex shrink-0 items-center">
          {plugin.node}
        </div>
      ))}
    </>
  )
}

type ChatToolbarCodeSlotRegistrationProps = {
  id: string
  node: ReactNode
  priority?: number
}

export function ChatToolbarCodeSlotRegistration({ id, node, priority }: ChatToolbarCodeSlotRegistrationProps) {
  const { registerPlugin } = useChatToolbarCodeSlotContext()

  useEffect(() => {
    return registerPlugin({ id, node, priority })
  }, [id, node, priority, registerPlugin])

  return null
}
