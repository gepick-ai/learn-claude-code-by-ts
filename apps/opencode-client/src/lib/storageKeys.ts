/** 定稿《配套对接》：仅存当前 `sessionId`。 */
export const STORAGE_SESSION_ID = "opencode-app.sessionId" as const

/**
 * 多会话侧栏 v1：客户端持久化已创建会话的 id/title（后端尚未提供列表 API 时）。
 * 不替代服务端权威；刷新页签后恢复左栏与当前选中项。
 */
export const STORAGE_SESSION_LIST = "opencode-app.sessionList" as const

export type SessionListEntry = { id: string; title: string }
