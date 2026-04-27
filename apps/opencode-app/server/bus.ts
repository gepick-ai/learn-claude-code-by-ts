export type BusPayload = {
  type: string
  properties: Record<string, unknown>
}

const subs = new Set<(e: BusPayload) => void | Promise<void>>()

export const MiniBus = {
  publish(payload: BusPayload) {
    for (const cb of subs) {
      void Promise.resolve(cb(payload)).catch(() => {})
    }
  },
  subscribeAll(cb: (e: BusPayload) => void | Promise<void>) {
    subs.add(cb)
    return () => {
      subs.delete(cb)
    }
  },
}
