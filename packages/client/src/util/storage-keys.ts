/** 定稿《配套对接》：刷新后恢复最后选中的 `sessionId`（须仍在 `GET /session` 列表中）。 */
export const STORAGE_SESSION_ID = "gepick-app.sessionId" as const
/** v4：刷新后恢复最后选中的 `projectId`（须仍在 `GET /project` 列表中）。 */
export const STORAGE_PROJECT_ID = "gepick-app.projectId" as const

/** 上一版产品名在 localStorage 中的会话 id 键；读取时迁移到 `STORAGE_SESSION_ID` 后删除。 */
export const LEGACY_STORAGE_SESSION_ID = "opencode-app.sessionId" as const

/** 旧版多会话侧栏在 localStorage 中缓存的列表键；`hydrate` 成功拉取后端列表后移除。 */
export const LEGACY_STORAGE_SESSION_LIST = "opencode-app.sessionList" as const
