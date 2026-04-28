import { clsx } from "clsx"
import { type CSSProperties, useEffect, useRef, useState } from "react"
import { useSpring } from "../motion-spring"

export interface TextStrikethroughProps {
  active: boolean
  text: string
  visualDuration?: number
  className?: string
  style?: CSSProperties
}

export function TextStrikethrough(props: TextStrikethroughProps) {
  const progress = useSpring(props.active ? 1 : 0, () => ({ visualDuration: props.visualDuration ?? 0.35, bounce: 0 }))
  const baseRef = useRef<HTMLSpanElement>(null)
  const rootRef = useRef<HTMLSpanElement>(null)
  const [tw, setTw] = useState(0)
  const [cw, setCw] = useState(0)

  const measure = () => {
    if (baseRef.current) setTw(baseRef.current.scrollWidth)
    if (rootRef.current) setCw(rootRef.current.offsetWidth)
  }

  useEffect(() => {
    measure()
    if (!rootRef.current || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [])

  const revealed = tw > 0 ? progress * tw : 0
  const overlayClip = cw <= 0 || tw <= 0 ? `inset(0 ${(1 - progress) * 100}% 0 0)` : `inset(0 ${Math.max(0, cw - revealed)}px 0 0)`
  const baseClip = revealed <= 0.5 ? "none" : `inset(0 0 0 ${revealed}px)`

  return (
    <span
      ref={rootRef}
      data-component="text-strikethrough"
      className={clsx(props.className)}
      style={{ display: "inline-grid", ...props.style }}
    >
      <span ref={baseRef} style={{ gridArea: "1 / 1", clipPath: baseClip }}>
        {props.text}
      </span>
      <span
        aria-hidden="true"
        data-slot="text-strikethrough-line"
        style={{
          gridArea: "1 / 1",
          textDecoration: "line-through",
          textDecorationColor: "currentColor",
          pointerEvents: "none",
          clipPath: overlayClip,
        }}
      >
        {props.text}
      </span>
    </span>
  )
}
