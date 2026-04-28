import { clsx } from "clsx"
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react"
import { useI18n } from "../../context/i18n"

export interface ScrollViewProps extends ComponentProps<"div"> {
  viewportRef?: (el: HTMLDivElement) => void
  orientation?: "vertical" | "horizontal"
}

export const scrollKey = (event: Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey">) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  if (event.key === "PageDown") return "page-down"
  if (event.key === "PageUp") return "page-up"
  if (event.key === "Home") return "home"
  if (event.key === "End") return "end"
  if (event.key === "ArrowUp") return "up"
  if (event.key === "ArrowDown") return "down"
}

export function ScrollView(props: ScrollViewProps) {
  const i18n = useI18n()
  const { className, viewportRef: onViewportRef, orientation: _orientation = "vertical", children, ...rest } = props
  const viewport = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState(false)
  const [drag, setDrag] = useState(false)
  const [height, setHeight] = useState(0)
  const [top, setTop] = useState(0)
  const [show, setShow] = useState(false)

  const update = () => {
    const view = viewport.current
    if (!view) return
    const scrollTop = view.scrollTop
    const scrollHeight = view.scrollHeight
    const clientHeight = view.clientHeight
    if (scrollHeight <= clientHeight || scrollHeight === 0) {
      setShow(false)
      return
    }
    setShow(true)
    const pad = 8
    const track = clientHeight - pad * 2
    const min = 32
    const nextHeight = Math.max((clientHeight / scrollHeight) * track, min)
    const maxScrollTop = scrollHeight - clientHeight
    const maxThumbTop = track - nextHeight
    const nextTop = maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0
    setHeight(nextHeight)
    setTop(pad + Math.max(0, Math.min(nextTop, maxThumbTop)))
  }

  useEffect(() => {
    const view = viewport.current
    if (!view) return
    onViewportRef?.(view)
    const observer = new ResizeObserver(() => update())
    observer.observe(view)
    if (view.firstElementChild instanceof HTMLElement) observer.observe(view.firstElementChild)
    update()
    return () => observer.disconnect()
  }, [onViewportRef])

  const onThumbPointerDown: ComponentProps<"div">["onPointerDown"] = (e) => {
    const node = thumb.current
    const view = viewport.current
    if (!node || !view) return
    e.preventDefault()
    e.stopPropagation()
    setDrag(true)
    const startY = e.clientY
    const startTop = view.scrollTop
    node.setPointerCapture(e.pointerId)
    const onMove = (event: PointerEvent) => {
      const delta = event.clientY - startY
      const maxScrollTop = view.scrollHeight - view.clientHeight
      const maxThumbTop = view.clientHeight - height
      if (maxThumbTop <= 0) return
      view.scrollTop = startTop + delta * (maxScrollTop / maxThumbTop)
    }
    const onUp = (event: PointerEvent) => {
      setDrag(false)
      node.releasePointerCapture(event.pointerId)
      node.removeEventListener("pointermove", onMove)
      node.removeEventListener("pointerup", onUp)
    }
    node.addEventListener("pointermove", onMove)
    node.addEventListener("pointerup", onUp)
  }

  const onKeyDown: ComponentProps<"div">["onKeyDown"] = (event) => {
    if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return
    const view = viewport.current
    if (!view) return
    const next = scrollKey(event.nativeEvent)
    if (!next) return
    const page = view.clientHeight * 0.8
    const line = 40
    if (next === "page-down") {
      event.preventDefault()
      view.scrollBy({ top: page, behavior: "smooth" })
      return
    }
    if (next === "page-up") {
      event.preventDefault()
      view.scrollBy({ top: -page, behavior: "smooth" })
      return
    }
    if (next === "home") {
      event.preventDefault()
      view.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    if (next === "end") {
      event.preventDefault()
      view.scrollTo({ top: view.scrollHeight, behavior: "smooth" })
      return
    }
    if (next === "up") {
      event.preventDefault()
      view.scrollBy({ top: -line, behavior: "smooth" })
      return
    }
    event.preventDefault()
    view.scrollBy({ top: line, behavior: "smooth" })
  }

  const root = clsx("scroll-view", className)
  const visible = useMemo(() => hover || drag, [drag, hover])

  return (
    <div
      {...rest}
      className={root}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <div
        ref={viewport}
        className="scroll-view__viewport"
        onScroll={(e) => {
          update()
          rest.onScroll?.(e)
        }}
        onWheel={rest.onWheel}
        onTouchStart={rest.onTouchStart}
        onTouchMove={rest.onTouchMove}
        onTouchEnd={rest.onTouchEnd}
        onTouchCancel={rest.onTouchCancel}
        onPointerDown={rest.onPointerDown}
        onClick={rest.onClick}
        tabIndex={0}
        role="region"
        aria-label={i18n.t("ui.scrollView.ariaLabel")}
        onKeyDown={(e) => {
          onKeyDown(e)
          rest.onKeyDown?.(e)
        }}
      >
        {children}
      </div>
      {show ? (
        <div
          ref={thumb}
          onPointerDown={onThumbPointerDown}
          className="scroll-view__thumb"
          data-visible={visible ? "true" : undefined}
          data-dragging={drag ? "true" : undefined}
          style={{ height: `${height}px`, transform: `translateY(${top}px)`, zIndex: 100 }}
        />
      ) : null}
    </div>
  )
}
