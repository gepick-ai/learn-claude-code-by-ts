import { create } from "zustand"
import {
  LEGACY_STORAGE_SESSION_ID,
  LEGACY_STORAGE_SESSION_LIST,
  STORAGE_PROJECT_ID,
  STORAGE_SESSION_ID,
} from "@/util/storage-keys"
import * as sessionApi from "./session-api"
import * as projectApi from "./project/project-api"
import { preferRicherLocalParts } from "./chat/assistant-visibility"
import { mergePartDelta, mergePartUpdated } from "./chat/sse/apply-sse-to-messages"
import type { Part, Project, SessionMessage } from "@gepick/sdk"

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

type ProjectRow = Pick<Project, "id" | "name">
type SessionRow = { id: string; title: string; projectId: string }

/**
 * React 18 开发态 StrictMode 会「挂载 → 卸挂载 → 再挂载」，useEffect 会连跑两次；
 * 若在首个 `await` 之后才把 `hydrated` 置 true，两次都会通过 `if (!hydrated)`，导致
 * `GET /session` 与 `GET .../message` 各发两遍。与 `chat/sse` 的 EventSource 单例一样用进行中 Promise 去重。
 */
let hydrateInFlight: Promise<void> | null = null

function readCurrentId(): string | null {
  const id = localStorage.getItem(STORAGE_SESSION_ID)
  if (id) return id
  const legacy = localStorage.getItem(LEGACY_STORAGE_SESSION_ID)
  if (legacy) {
    localStorage.setItem(STORAGE_SESSION_ID, legacy)
    localStorage.removeItem(LEGACY_STORAGE_SESSION_ID)
    return legacy
  }
  return null
}

function readCurrentProjectId(): string | null {
  return localStorage.getItem(STORAGE_PROJECT_ID)
}

function writeCurrentId(id: string | null) {
  if (id) localStorage.setItem(STORAGE_SESSION_ID, id)
  else localStorage.removeItem(STORAGE_SESSION_ID)
}

function writeCurrentProjectId(id: string | null) {
  if (id) localStorage.setItem(STORAGE_PROJECT_ID, id)
  else localStorage.removeItem(STORAGE_PROJECT_ID)
}

function toSessionRows(list: Array<{ id: string; title: string; projectId: string }>): SessionRow[] {
  return list.map((s) => ({ id: s.id, title: s.title, projectId: s.projectId }))
}

function buildSessionsByProject(rows: SessionRow[]): Record<string, SessionRow[]> {
  const map: Record<string, SessionRow[]> = {}
  for (const row of rows) {
    if (!map[row.projectId]) map[row.projectId] = []
    map[row.projectId]!.push(row)
  }
  return map
}

function pickCurrentSessionId(rows: SessionRow[], preferredId: string | null): string | null {
  if (preferredId && rows.some((s) => s.id === preferredId)) return preferredId
  return rows[0]?.id ?? null
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
  projects: ProjectRow[]
  currentProjectId: string | null
  /** 左侧列表（id + 展示用 title） */
  sessions: SessionRow[]
  sessionsByProject: Record<string, SessionRow[]>
  currentSessionId: string | null
  /** 按 session 缓存的完整消息；切换会话时懒加载/刷新 */
  messagesBySession: Record<string, SessionMessage[]>
  listLoading: boolean
  messageLoading: boolean
  sendLoading: boolean
  lastError: string | null
  hydrated: boolean
  /**
   * 与现网会话流行为一致：本轮回合里**首条**带 `messageId` 的 SSE 视为 user 侧 id，用于跳过该 id 的增量（流式只合并助手侧）。
   * 在每次发送开始时清空，发送结束或切会话时清空。
   */
  turnAnchorMessageId: string | null
  /** 正在执行删除 API 的会话 id，用于禁用对应项的删除按钮 */
  deletingSessionId: string | null
  /** v6：会话历史抽屉是否打开 */
  sessionHistoryOpen: boolean
  setSessionHistoryOpen: (open: boolean) => void
  toggleSessionHistory: () => void

  hydrate: () => Promise<void>
  createNewProject: () => Promise<void>
  selectProject: (projectId: string) => Promise<void>
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
      projects: [],
      currentProjectId: null,
      sessions: [],
      sessionsByProject: {},
      currentSessionId: null,
      messagesBySession: {},
      listLoading: false,
      messageLoading: false,
      sendLoading: false,
      lastError: null,
      hydrated: false,
      turnAnchorMessageId: null,
      deletingSessionId: null,
      sessionHistoryOpen: false,

      setSessionHistoryOpen: (open) => set({ sessionHistoryOpen: open }),

      toggleSessionHistory: () => set((s) => ({ sessionHistoryOpen: !s.sessionHistoryOpen })),

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
            const storedProjectId = readCurrentProjectId()
            const storedId = readCurrentId()
            const [projectList, sessionList] = await Promise.all([
              projectApi.listProjects(),
              sessionApi.listSessions(),
            ])
            try {
              localStorage.removeItem(LEGACY_STORAGE_SESSION_LIST)
            } catch {
              /* 非浏览器环境等 */
            }

            const projects: ProjectRow[] = projectList.map((p) => ({ id: p.id, name: p.name }))
            const allSessions = toSessionRows(
              sessionList.map((s) => ({ id: s.id, title: s.title, projectId: s.projectId })),
            )
            const sessionsByProject = buildSessionsByProject(allSessions)
            const currentProjectId =
              storedProjectId && projects.some((p) => p.id === storedProjectId)
                ? storedProjectId
                : (projects[0]?.id ?? null)
            const scopedSessions = currentProjectId ? (sessionsByProject[currentProjectId] ?? []) : []
            const currentSessionId = pickCurrentSessionId(scopedSessions, storedId)
            writeCurrentProjectId(currentProjectId)
            writeCurrentId(currentSessionId)
            set({
              projects,
              currentProjectId,
              sessionsByProject,
              sessions: scopedSessions,
              currentSessionId,
              hydrated: true,
              listLoading: false,
            })

            if (currentSessionId) {
              await get().loadMessages(currentSessionId)
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

      createNewProject: async () => {
        set({ listLoading: true, lastError: null })
        try {
          const project = await projectApi.createProject()
          const row: ProjectRow = { id: project.id, name: project.name }
          const projects = [row, ...get().projects.filter((p) => p.id !== row.id)]
          const sessionsByProject = { ...get().sessionsByProject, [row.id]: [] }
          writeCurrentProjectId(row.id)
          writeCurrentId(null)
          set({
            projects,
            currentProjectId: row.id,
            sessionsByProject,
            sessions: [],
            currentSessionId: null,
            listLoading: false,
            messageLoading: false,
            turnAnchorMessageId: null,
          })
        } catch (e) {
          set({
            listLoading: false,
            lastError: e instanceof Error ? e.message : "创建 Project 失败",
          })
        }
      },

      selectProject: async (projectId: string) => {
        const st = get()
        if (projectId === st.currentProjectId) return
        const nextSessions = st.sessionsByProject[projectId] ?? []
        const nextCurrentSessionId = nextSessions[0]?.id ?? null
        writeCurrentProjectId(projectId)
        writeCurrentId(nextCurrentSessionId)
        set({
          currentProjectId: projectId,
          sessions: nextSessions,
          currentSessionId: nextCurrentSessionId,
          messageLoading: Boolean(nextCurrentSessionId),
          sendLoading: false,
          turnAnchorMessageId: null,
          lastError: null,
        })
        if (nextCurrentSessionId) {
          await get().loadMessages(nextCurrentSessionId)
        }
      },

      createNewSession: async () => {
        const projectId = get().currentProjectId
        if (!projectId) {
          set({ lastError: "请先创建或选择 Project" })
          return
        }
        set({ listLoading: true, lastError: null })
        try {
          const { session } = await sessionApi.createSession(projectId)
          const row: SessionRow = { id: session.id, title: session.title, projectId }
          const st = get()
          const nextProjectSessions = [row, ...(st.sessionsByProject[projectId] ?? []).filter((s) => s.id !== row.id)]
          const sessionsByProject = { ...st.sessionsByProject, [projectId]: nextProjectSessions }
          const sessions = st.currentProjectId === projectId ? nextProjectSessions : st.sessions
          writeCurrentId(row.id)
          set({
            sessionsByProject,
            sessions,
            currentSessionId: row.id,
            messagesBySession: { ...st.messagesBySession, [row.id]: [] },
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
        let ownerProjectId: string | null = null
        for (const [pid, list] of Object.entries(st0.sessionsByProject)) {
          if (list.some((s) => s.id === sessionId)) {
            ownerProjectId = pid
            break
          }
        }
        if (!ownerProjectId) return false

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
        const ownerSessions = st.sessionsByProject[ownerProjectId] ?? []
        const idx = ownerSessions.findIndex((s) => s.id === sessionId)
        const nextOwnerSessions = ownerSessions.filter((s) => s.id !== sessionId)
        const sessionsByProject = { ...st.sessionsByProject, [ownerProjectId]: nextOwnerSessions }
        const isCurrentProject = st.currentProjectId === ownerProjectId
        const filtered = isCurrentProject ? nextOwnerSessions : st.sessions
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
          sessionsByProject,
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
