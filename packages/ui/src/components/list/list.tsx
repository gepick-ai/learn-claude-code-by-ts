import { clsx } from "clsx"
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { useFilteredList, type FilteredListProps } from "../../hooks"
import { useI18n } from "../../context/i18n"
import { Icon, type IconName } from "../icon"
import { IconButton } from "../icon-button"
import { TextField } from "../text-field"

function findByKey(container: HTMLElement, key: string) {
  const nodes = container.querySelectorAll<HTMLElement>('[data-slot="list-item"][data-key]')
  for (const node of nodes) if (node.getAttribute("data-key") === key) return node
}

export interface ListSearchProps {
  placeholder?: string
  autofocus?: boolean
  hideIcon?: boolean
  className?: string
  action?: ReactNode
}

export interface ListAddProps {
  className?: string
  render: () => ReactNode
}

export interface ListProps<T> extends FilteredListProps<T> {
  className?: string
  children: (item: T) => ReactNode
  emptyMessage?: string
  loadingMessage?: string
  onKeyEvent?: (event: KeyboardEvent, item: T | undefined) => void
  onMove?: (item: T | undefined) => void
  onFilter?: (value: string) => void
  activeIcon?: IconName
  filter?: string
  search?: ListSearchProps | boolean
  itemWrapper?: (item: T, node: ReactNode) => ReactNode
  divider?: boolean
  add?: ListAddProps
  groupHeader?: (group: { category: string; items: T[] }) => ReactNode
}

export interface ListRef {
  onKeyDown: (e: KeyboardEvent) => void
  setScrollRef: (el: HTMLDivElement | undefined) => void
  setFilter: (value: string) => void
}

export function List<T>(props: ListProps<T> & { ref?: (ref: ListRef) => void }) {
  const i18n = useI18n()
  const [scroll, setScroll] = useState<HTMLDivElement>()
  const [text, setText] = useState("")
  const [mouse, setMouse] = useState(false)
  const input = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const sticks = useRef(new Map<string, HTMLDivElement>())
  const [stuck, setStuck] = useState<Record<string, boolean>>({})
  const { filter, grouped, flat, active, setActive, onKeyDown, onInput, refetch } = useFilteredList<T>(props)

  const search = () => (typeof props.search === "object" ? props.search : {})
  const add = () => props.add
  const showAdd = () => !!add()
  const keyFor = props.itemKey

  const applyFilter = (value: string, opts?: { ref?: boolean }) => {
    const prev = filter()
    setText(value)
    onInput(value)
    props.onFilter?.(value)
    if (!opts?.ref) return
    if (prev === value) refetch()
    else queueMicrotask(() => refetch())
  }

  useEffect(() => {
    if (props.filter === undefined) return
    if (props.filter === text) return
    setText(props.filter)
    onInput(props.filter)
  }, [onInput, props.filter, text])

  useEffect(() => {
    scroll?.scrollTo(0, 0)
  }, [scroll, filter()])

  useEffect(() => {
    if (!scroll || !props.current) return
    const key = keyFor(props.current)
    requestAnimationFrame(() => {
      const node = findByKey(scroll, key)
      if (!node) return
      node.scrollIntoView({ block: "center" })
    })
  }, [keyFor, props.current, scroll])

  useEffect(() => {
    const list = flat()
    const item = list.find((x) => keyFor(x) === active())
    props.onMove?.(item)
  }, [active, flat, keyFor, props])

  useEffect(() => {
    props.ref?.({
      onKeyDown: (e) => handleKey(e),
      setScrollRef: (el) => setScroll(el),
      setFilter: (value) => applyFilter(value, { ref: true }),
    })
  })

  useEffect(() => {
    if (!scroll) return
    const onScroll = () => {
      const box = scroll.getBoundingClientRect()
      const next: Record<string, boolean> = {}
      for (const [id, node] of sticks.current.entries()) {
        const rect = node.getBoundingClientRect()
        next[id] = rect.top <= box.top + 1 && scroll.scrollTop > 0
      }
      setStuck(next)
    }
    scroll.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => scroll.removeEventListener("scroll", onScroll)
  }, [scroll, grouped.latest.length])

  const handleSelect = (item: T | undefined, index: number) => props.onSelect?.(item, index)

  const handleKey = (e: KeyboardEvent) => {
    setMouse(false)
    if (e.key === "Escape") return
    const list = flat()
    const item = list.find((x) => keyFor(x) === active())
    const idx = item ? list.indexOf(item) : -1
    props.onKeyEvent?.(e, item)
    if (e.defaultPrevented) return
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault()
      if (item) handleSelect(item, idx)
      return
    }
    if (props.search) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || (e.ctrlKey && (e.key === "n" || e.key === "p"))) {
        onKeyDown(e)
      }
      return
    }
    onKeyDown(e)
  }

  const message = useMemo(() => {
    if (grouped.loading) return props.loadingMessage ?? i18n.t("ui.list.loading")
    if (props.emptyMessage) return props.emptyMessage
    const q = filter()
    if (!q) return i18n.t("ui.list.empty")
    const suffix = i18n.t("ui.list.emptyWithFilter.suffix")
    return `${i18n.t("ui.list.emptyWithFilter.prefix")} "${q}"${suffix ? ` ${suffix}` : ""}`
  }, [filter, grouped.loading, i18n, props.emptyMessage, props.loadingMessage])

  return (
    <div data-component="list" className={clsx(props.className)}>
      {props.search ? (
        <div data-slot="list-search-wrapper">
          <div
            data-slot="list-search"
            className={clsx(search().className)}
            onPointerDown={(event) => {
              input.current?.focus()
              event.stopPropagation()
            }}
          >
            <div data-slot="list-search-container">
              {!search().hideIcon ? <Icon name="magnifying-glass" /> : null}
              <TextField
                autoFocus={search().autofocus}
                variant="ghost"
                data-slot="list-search-input"
                type="text"
                ref={(el) => {
                  input.current = el
                }}
                value={text}
                onChange={(value) => applyFilter(value)}
                onKeyDown={(e) => handleKey(e.nativeEvent)}
                placeholder={search().placeholder}
                spellCheck={false}
                autoCorrect="off"
                autoComplete="off"
                autoCapitalize="off"
              />
            </div>
            {text ? (
              <IconButton
                icon="circle-x"
                variant="ghost"
                onClick={() => {
                  setText("")
                  onInput("")
                  queueMicrotask(() => input.current?.focus())
                }}
                aria-label={i18n.t("ui.list.clearFilter")}
              />
            ) : null}
          </div>
          {search().action}
        </div>
      ) : null}
      <div
        ref={(el) => {
          setScroll(el ?? undefined)
        }}
        data-slot="list-scroll"
      >
        {flat().length > 0 || showAdd() ? (
          grouped.latest.map((group, groupIndex) => (
            <div key={group.category || String(groupIndex)} data-slot="list-group">
              {group.category ? (
                <div
                  data-slot="list-header"
                  data-stuck={stuck[group.category] ? "true" : undefined}
                  ref={(el) => {
                    if (el) sticks.current.set(group.category, el)
                    else sticks.current.delete(group.category)
                  }}
                >
                  {props.groupHeader?.(group) ?? group.category}
                </div>
              ) : null}
              <div data-slot="list-items">
                {group.items.map((item, i) => {
                  const node = (
                    <button
                      key={keyFor(item)}
                      data-slot="list-item"
                      data-key={keyFor(item)}
                      data-active={keyFor(item) === active() ? "true" : undefined}
                      data-selected={item === props.current ? "true" : undefined}
                      onClick={() => handleSelect(item, i)}
                      onKeyDown={(e: ReactKeyboardEvent<HTMLButtonElement>) => handleKey(e.nativeEvent)}
                      type="button"
                      onMouseMove={(event) => {
                        if (event.movementX === 0 && event.movementY === 0) return
                        setMouse(true)
                        setActive(keyFor(item))
                      }}
                      onMouseLeave={() => {
                        if (!mouse) return
                        setActive(null)
                      }}
                    >
                      {props.children(item)}
                      {item === props.current ? (
                        <span data-slot="list-item-selected-icon">
                          <Icon name="check-small" />
                        </span>
                      ) : null}
                      {props.activeIcon ? (
                        <span data-slot="list-item-active-icon">
                          <Icon name={props.activeIcon} />
                        </span>
                      ) : null}
                      {props.divider && (i !== group.items.length - 1 || (showAdd() && groupIndex === grouped.latest.length - 1)) ? (
                        <span data-slot="list-item-divider" />
                      ) : null}
                    </button>
                  )
                  return props.itemWrapper ? <div key={keyFor(item)}>{props.itemWrapper(item, node)}</div> : node
                })}
                {showAdd() && groupIndex === grouped.latest.length - 1 ? (
                  <div data-slot="list-item-add" className={clsx(add()?.className)}>
                    {add()?.render()}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div data-slot="list-empty-state">
            <div data-slot="list-message">{message}</div>
          </div>
        )}
      </div>
    </div>
  )
}
