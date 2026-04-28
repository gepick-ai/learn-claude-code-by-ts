import { useEffect } from "react"
import { acquireSessionSse, releaseSessionSse } from "./sessionSseClient"

/**
 * 订阅 `GET /sse/event`，把 `session.part.*` 写入与《配套对接》一致的 Zustand。
 * 全页挂一次即可；用模块级单例 + 短延迟释放在开发态下避免 StrictMode 反复 `EventSource#close` 造成 `ERR_INCOMPLETE_CHUNKED_ENCODING`。
 */
export function useSessionSse() {
  useEffect(() => {
    acquireSessionSse()
    return () => {
      releaseSessionSse()
    }
  }, [])
}
