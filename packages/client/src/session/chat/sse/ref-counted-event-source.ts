/**
 * 对同一 URL 维持单例 {@link EventSource}，用引用计数管理生命周期。
 * 最后一次 `release` 后延迟关闭，减轻 React 18 开发态 StrictMode（挂载→卸载→再挂载）
 * 下反复 `EventSource#close` 在 Chrome 中出现的 `ERR_INCOMPLETE_CHUNKED_ENCODING` 噪音。
 */
export function createRefCountedEventSource(options: {
  url: string
  /** @default 500 */
  releaseDelayMs?: number
}) {
  const releaseDelayMs = options.releaseDelayMs ?? 500
  let stream: EventSource | null = null
  let subscribers = 0
  let closeTimer: ReturnType<typeof setTimeout> | null = null

  function acquire(onMessage: (ev: MessageEvent) => void): void {
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
    subscribers += 1
    if (stream) {
      stream.onmessage = onMessage
      return
    }
    stream = new EventSource(options.url)
    stream.onmessage = onMessage
  }

  function release(): void {
    subscribers = Math.max(0, subscribers - 1)
    if (subscribers > 0) return
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = setTimeout(() => {
      closeTimer = null
      if (subscribers > 0) return
      if (stream) {
        stream.close()
        stream = null
      }
    }, releaseDelayMs)
  }

  return { acquire, release }
}
