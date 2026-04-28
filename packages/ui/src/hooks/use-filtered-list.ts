import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export interface FilteredListProps<T> {
  items: T[] | ((filter: string) => T[] | Promise<T[]>)
  itemKey: (item: T) => string
  filterKeys?: string[]
  current?: T
  groupBy?: (x: T) => string
  sortBy?: (a: T, b: T) => number
  sortGroupsBy?: (a: { category: string; items: T[] }, b: { category: string; items: T[] }) => number
  onSelect?: (value: T | undefined, index: number) => void
  noInitialSelection?: boolean
}

type Group<T> = { category: string; items: T[] }

function hit<T>(item: T, query: string, keys?: string[]) {
  if (!query) return true
  const needle = query.toLowerCase()
  if (typeof item === "string") return item.toLowerCase().includes(needle)
  if (!keys || keys.length === 0) return String(item).toLowerCase().includes(needle)
  for (const key of keys) {
    const v = (item as Record<string, unknown>)[key]
    if (String(v ?? "").toLowerCase().includes(needle)) return true
  }
  return false
}

export function useFilteredList<T>(props: FilteredListProps<T>) {
  const [filter, setFilter] = useState("")
  const [latest, setLatest] = useState<Group<T>[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState<string>("")
  const [tick, setTick] = useState(0)
  const seq = useRef(0)

  const refetch = useCallback(() => setTick((x) => x + 1), [])

  useEffect(() => {
    let alive = true
    const id = ++seq.current
    const run = async () => {
      const src = props.items
      const list = await Promise.resolve(typeof src === "function" ? src(filter) : src)
      if (!alive || id !== seq.current) return
      const base = (list ?? []).filter((item) => hit(item, filter, props.filterKeys))
      const map = new Map<string, T[]>()
      for (const item of base) {
        const key = props.groupBy ? props.groupBy(item) : ""
        const group = map.get(key)
        if (group) group.push(item)
        else map.set(key, [item])
      }
      const groups = Array.from(map.entries()).map(([category, items]) => ({
        category,
        items: props.sortBy ? [...items].sort(props.sortBy) : items,
      }))
      const next = props.sortGroupsBy ? groups.sort(props.sortGroupsBy) : groups
      setLatest(next)
      setLoading(false)
    }
    setLoading(true)
    run().catch(() => {
      if (!alive || id !== seq.current) return
      setLatest([])
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [filter, props.filterKeys, props.groupBy, props.items, props.sortBy, props.sortGroupsBy, tick])

  const flat = useMemo(() => latest.flatMap((group) => group.items), [latest])

  useEffect(() => {
    if (props.noInitialSelection) {
      setActive("")
      return
    }
    if (props.current) {
      setActive(props.itemKey(props.current))
      return
    }
    const first = flat[0]
    setActive(first ? props.itemKey(first) : "")
  }, [flat, props.current, props.itemKey, props.noInitialSelection])

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault()
        const idx = flat.findIndex((item) => props.itemKey(item) === active)
        const item = idx >= 0 ? flat[idx] : undefined
        if (item) props.onSelect?.(item, idx)
        return
      }
      const forward = event.key === "ArrowDown" || (event.ctrlKey && event.key === "n")
      const backward = event.key === "ArrowUp" || (event.ctrlKey && event.key === "p")
      if (!forward && !backward) return
      event.preventDefault()
      if (flat.length === 0) return
      const idx = Math.max(0, flat.findIndex((item) => props.itemKey(item) === active))
      const next = forward ? (idx + 1) % flat.length : (idx - 1 + flat.length) % flat.length
      const item = flat[next]
      if (!item) return
      setActive(props.itemKey(item))
    },
    [active, flat, props],
  )

  return {
    grouped: { latest, loading },
    filter: () => filter,
    flat: () => flat,
    reset: () => {
      const first = flat[0]
      setActive(first ? props.itemKey(first) : "")
    },
    refetch,
    clear: () => setFilter(""),
    onKeyDown,
    onInput: (value: string) => setFilter(value),
    active: () => active,
    setActive: (key: string | null) => setActive(key ?? ""),
  }
}
