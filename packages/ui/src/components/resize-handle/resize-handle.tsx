import { clsx } from "clsx"
import { type HTMLAttributes, type MouseEvent as ReactMouseEvent } from "react"

export interface ResizeHandleProps extends Omit<HTMLAttributes<HTMLDivElement>, "onResize"> {
  direction: "horizontal" | "vertical"
  edge?: "start" | "end"
  size: number
  min: number
  max: number
  onResize: (size: number) => void
  onCollapse?: () => void
  collapseThreshold?: number
}

export function ResizeHandle(props: ResizeHandleProps) {
  const {
    direction,
    edge,
    size,
    min,
    max,
    onResize,
    onCollapse,
    collapseThreshold,
    className,
    onMouseDown,
    ...rest
  } = props

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    onMouseDown?.(e)
    if (e.defaultPrevented) return
    e.preventDefault()
    const dirEdge = edge ?? (direction === "vertical" ? "start" : "end")
    const start = direction === "horizontal" ? e.clientX : e.clientY
    const startSize = size
    let current = startSize

    document.body.style.userSelect = "none"
    document.body.style.overflow = "hidden"

    const onMove = (moveEvent: MouseEvent) => {
      const pos = direction === "horizontal" ? moveEvent.clientX : moveEvent.clientY
      const delta =
        direction === "vertical"
          ? dirEdge === "end"
            ? pos - start
            : start - pos
          : dirEdge === "start"
            ? start - pos
            : pos - start
      current = startSize + delta
      onResize(Math.min(max, Math.max(min, current)))
    }

    const onUp = () => {
      document.body.style.userSelect = ""
      document.body.style.overflow = ""
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      const threshold = collapseThreshold ?? 0
      if (onCollapse && threshold > 0 && current < threshold) onCollapse()
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }

  return (
    <div
      {...rest}
      data-component="resize-handle"
      data-direction={direction}
      data-edge={edge ?? (direction === "vertical" ? "start" : "end")}
      className={clsx(className)}
      onMouseDown={handleMouseDown}
    />
  )
}
