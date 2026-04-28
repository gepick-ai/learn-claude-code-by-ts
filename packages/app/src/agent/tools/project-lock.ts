/** 同一 projectId 上的工具调用串行化（写互斥）。 */
const tails = new Map<string, Promise<unknown>>()

export function withProjectToolLock<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
  const prev = tails.get(projectId) ?? Promise.resolve()
  const result = prev.then(() => fn())
  tails.set(projectId, result.then(() => {}, () => {}))
  return result
}
