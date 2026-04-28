import { create } from "zustand"
import { LEGACY_STORAGE_SESSION_LIST, STORAGE_SESSION_ID } from "@/lib/storageKeys"
import * as sessionApi from "../api"
import { preferRicherLocalParts } from "../messages/assistantVisibility"
import { mergePartDelta, mergePartUpdated } from "../sse/applySseToMessages"
import type { Part, SessionMessage } from "../types"

const OPTIMISTIC_USER_ID_PREFIX = "client-optimistic-user:"

/** 发送后立刻插入列表，等接口返回后由 GET message 全量覆盖 */
function makeOptimisticUserMessage(sessionId: string, text: string): SessionMessage {
  const mid = `${OPTIMISTIC_USER_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return {
    message: {
      id: mid,
      sessionId,
      createdAt: Date.now(),
      role: "user",
    },
    parts: [
      {
        id: `${mid}:text`,
        sessionId,
        messageId: mid,
        type: "text",
        text,
      },
    ],
  }
}

type SessionRow = { id: string; title: string }

/**
 * React 18 开发态 StrictMode 会「挂载 → 卸挂载 → 再挂载」，useEffect 会连跑两次；
 * 若在首个 `await` 之后才把 `hydrated` 置 true，两次都会通过 `if (!hydrated)`，导致
 * `GET /session` 与 `GET .../message` 各发两遍。与 `sessionSseClient` 一样用进行中 Promise 去重。
 */
let hydrateInFlight: Promise<void> | null = null

function readCurrentId(): string | null {
  return localStorage.getItem(STORAGE_SESSION_ID)
}

function writeCurrentId(id: string | null) {
  if (id) localStorage.setItem(STORAGE_SESSION_ID, id)
  else localStorage.removeItem(STORAGE_SESSION_ID)
}

/**
 * 仅当「同 id 的那条在列表里已是**用户**行」时吞掉，避免同一条用户消息在 SSE 里再画一遍。
 * 原逻辑是 `mid === turnAnchor` 一律吞：若 `turnAnchor` 被设成**助手**的 messageId，会把整段 `part.delta` 全吞没（与 Network 里 SSE 正常、界面空白的症状一致）。
 */
function shouldSkipAsUserDuplicate(
  messagesBySession: Record<string, SessionMessage[]>,
  sessionId: string,
  turnAnchorMessageId: string | null,
  mid: string | undefined,
): boolean {
  if (!mid || !turnAnchorMessageId || mid !== turnAnchorMessageId) return false
  const row = (messagesBySession[sessionId] ?? []).find((m) => m.message.id === turnAnchorMessageId)
  return row?.message.role === "user"
}

type SessionState = {
  /** 左侧列表（id + 展示用 title） */
  sessions: SessionRow[]
  currentSessionId: string | null
  /** 按 session 缓存的完整消息；切换会话时懒加载/刷新 */
  messagesBySession: Record<string, SessionMessage[]>
  listLoading: boolean
  messageLoading: boolean
  sendLoading: boolean
  lastError: string | null
  hydrated: boolean
  /**
   * 与现网 `frontend.html` 一致：本轮回合里**首条**带 `messageId` 的 SSE 视为 user 侧 id，用于跳过该 id 的增量（流式只合并助手侧）。
   * 在每次发送开始时清空，发送结束或切会话时清空。
   */
  turnAnchorMessageId: string | null
  /** 正在执行删除 API 的会话 id，用于禁用对应项的删除按钮 */
  deletingSessionId: string | null

  hydrate: () => Promise<void>
  createNewSession: () => Promise<void>
  selectSession: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<boolean>
  loadMessages: (sessionId: string) => Promise<void>
  sendUserText: (text: string) => Promise<void>
  clearError: () => void
  applySsePartUpdated: (part: Part) => void
  applySsePartDelta: (d: {
    sessionId: string
    messageId: string
    partId: string
    field: string
    delta: string
  }) => void
  clearStreamAnchor: () => void
}

export const useSessionStore = create<SessionState>()((set, get) => ({
      sessions: [],
      currentSessionId: null,
      messagesBySession: {},
      listLoading: false,
      messageLoading: false,
      sendLoading: false,
      lastError: null,
      hydrated: false,
      turnAnchorMessageId: null,
      deletingSessionId: null,

      clearError: () => set({ lastError: null }),

      clearStreamAnchor: () => set({ turnAnchorMessageId: null }),

      applySsePartUpdated: (part: Part) => {
        if (!get().sessions.some((s) => s.id === part.sessionId)) return
        set((st) => {
          const mid = part.messageId
          if (mid) {
            if (st.turnAnchorMessageId == null) {
              return { turnAnchorMessageId: mid }
            }
            if (shouldSkipAsUserDuplicate(st.messagesBySession, part.sessionId, st.turnAnchorMessageId, mid)) {
              return {}
            }
          }
          const list = st.messagesBySession[part.sessionId] ?? []
          const merged = mergePartUpdated(list, part)
          return {
            messagesBySession: { ...st.messagesBySession, [part.sessionId]: merged },
          }
        })
      },

      applySsePartDelta: (p) => {
        if (!get().sessions.some((s) => s.id === p.sessionId)) return
        set((st) => {
          const mid = p.messageId
          if (mid) {
            if (st.turnAnchorMessageId == null) {
              const list = st.messagesBySession[p.sessionId] ?? []
              const merged = mergePartDelta(list, p)
              return {
                turnAnchorMessageId: mid,
                messagesBySession: { ...st.messagesBySession, [p.sessionId]: merged },
              }
            }
            if (shouldSkipAsUserDuplicate(st.messagesBySession, p.sessionId, st.turnAnchorMessageId, mid)) {
              return {}
            }
          }
          const list = st.messagesBySession[p.sessionId] ?? []
          const merged = mergePartDelta(list, p)
          return {
            messagesBySession: { ...st.messagesBySession, [p.sessionId]: merged },
          }
        })
      },

      hydrate: async () => {
        if (get().hydrated) return
        if (hydrateInFlight) return hydrateInFlight
        hydrateInFlight = (async () => {
          set({ listLoading: true, lastError: null })
          try {
            const storedId = readCurrentId()
            const list = await sessionApi.listSessions()
            try {
              localStorage.removeItem(LEGACY_STORAGE_SESSION_LIST)
            } catch {
              /* 非浏览器环境等 */
            }

            const sessions: SessionRow[] = list.map((s) => ({ id: s.id, title: s.title }))
            const current =
              storedId && sessions.some((s) => s.id === storedId) ? storedId : (sessions[0]?.id ?? null)
            if (current) writeCurrentId(current)
            else writeCurrentId(null)
            set({ sessions, currentSessionId: current, hydrated: true, listLoading: false })

            if (current) {
              await get().loadMessages(current)
            }
          } catch (e) {
            set({
              listLoading: false,
              hydrated: true,
              lastError: e instanceof Error ? e.message : "无法加载会话",
            })
          } finally {
            hydrateInFlight = null
          }
        })()
        return hydrateInFlight
      },

      createNewSession: async () => {
        set({ listLoading: true, lastError: null })
        try {
          const { session } = await sessionApi.createSession()
          const row = { id: session.id, title: session.title }
          const sessions = [row, ...get().sessions.filter((s) => s.id !== row.id)]
          writeCurrentId(row.id)
          set({
            sessions,
            currentSessionId: row.id,
            messagesBySession: { ...get().messagesBySession, [row.id]: [] },
            listLoading: false,
          })
        } catch (e) {
          set({
            listLoading: false,
            lastError: e instanceof Error ? e.message : "创建会话失败",
          })
        }
      },

      selectSession: async (sessionId: string) => {
        if (sessionId === get().currentSessionId) return
        writeCurrentId(sessionId)
        set({ currentSessionId: sessionId, lastError: null, turnAnchorMessageId: null })
        await get().loadMessages(sessionId)
      },

      deleteSession: async (sessionId: string) => {
        if (get().deletingSessionId) return false
        const st0 = get()
        if (!st0.sessions.some((s) => s.id === sessionId)) return false

        set({ deletingSessionId: sessionId, lastError: null })
        try {
          await sessionApi.deleteSession(sessionId)
        } catch (e) {
          set({
            deletingSessionId: null,
            lastError: e instanceof Error ? e.message : "删除会话失败",
          })
          return false
        }

        const st = get()
        const idx = st.sessions.findIndex((s) => s.id === sessionId)
        const filtered = st.sessions.filter((s) => s.id !== sessionId)
        const restMessages = { ...st.messagesBySession }
        delete restMessages[sessionId]

        const wasCurrent = st.currentSessionId === sessionId
        let nextCurrent = st.currentSessionId
        let loadTarget: string | null = null

        if (wasCurrent) {
          if (filtered.length === 0) {
            nextCurrent = null
          } else {
            const nextIdx = idx === -1 ? 0 : Math.min(idx, filtered.length - 1)
            nextCurrent = filtered[nextIdx]!.id
          }
          loadTarget = nextCurrent
        }

        if (nextCurrent) writeCurrentId(nextCurrent)
        else writeCurrentId(null)

        set({
          sessions: filtered,
          messagesBySession: restMessages,
          currentSessionId: nextCurrent,
          deletingSessionId: null,
          turnAnchorMessageId: wasCurrent ? null : st.turnAnchorMessageId,
          sendLoading: wasCurrent ? false : st.sendLoading,
          ...(wasCurrent && !nextCurrent ? { messageLoading: false } : {}),
        })

        if (loadTarget) {
          await get().loadMessages(loadTarget)
        }
        return true
      },

      loadMessages: async (sessionId: string) => {
        set({ messageLoading: true, lastError: null })
        try {
          const list = await sessionApi.getMessages(sessionId)
          set((st) => ({
            messagesBySession: { ...st.messagesBySession, [sessionId]: list },
            messageLoading: false,
          }))
        } catch (e) {
          set({
            messageLoading: false,
            lastError: e instanceof Error ? e.message : "加载消息失败",
          })
        }
      },

      sendUserText: async (text: string) => {
        const sessionId = get().currentSessionId
        if (!sessionId) return
        const t = text.trim()
        if (!t) return

        const optimistic = makeOptimisticUserMessage(sessionId, t)
        set((st) => {
          const list = st.messagesBySession[sessionId] ?? []
          return {
            sendLoading: true,
            lastError: null,
            turnAnchorMessageId: null,
            messagesBySession: {
              ...st.messagesBySession,
              [sessionId]: [...list, optimistic],
            },
          }
        })

        const dropOptimistic = () => {
          set((st) => ({
            messagesBySession: {
              ...st.messagesBySession,
              [sessionId]: (st.messagesBySession[sessionId] ?? []).filter(
                (m) => m.message.id !== optimistic.message.id,
              ),
            },
          }))
        }

        try {
          const result = await sessionApi.postUserMessage(sessionId, { parts: [{ type: "text", text: t }] })
          if (!result.success) {
            dropOptimistic()
            set({ sendLoading: false, lastError: result.error ?? "发送失败", turnAnchorMessageId: null })
            return
          }
          const listRaw = await sessionApi.getMessages(sessionId)
          const list = preferRicherLocalParts(listRaw, get().messagesBySession[sessionId])
          set((st) => ({
            messagesBySession: { ...st.messagesBySession, [sessionId]: list },
            sendLoading: false,
            turnAnchorMessageId: null,
          }))
        } catch (e) {
          dropOptimistic()
          set({
            sendLoading: false,
            lastError: e instanceof Error ? e.message : "发送失败",
            turnAnchorMessageId: null,
          })
        }
      },
}))
