import { clsx } from "clsx"
import { type CSSProperties, useEffect, useRef, useState } from "react"

const px = (value: number | string | undefined, fallback: number) => {
  if (typeof value === "number") return `${value}px`
  if (typeof value === "string") return value
  return `${fallback}px`
}

const ms = (value: number | string | undefined, fallback: number) => {
  if (typeof value === "number") return `${value}ms`
  if (typeof value === "string") return value
  return `${fallback}ms`
}

const pct = (value: number | undefined, fallback: number) => `${value ?? fallback}%`

export interface TextRevealProps {
  text?: string
  className?: string
  duration?: number | string
  edge?: number
  travel?: number | string
  spring?: string
  springSoft?: string
  growOnly?: boolean
  truncate?: boolean
}

export function TextReveal(props: TextRevealProps) {
  const [cur, setCur] = useState(props.text)
  const [old, setOld] = useState<string | undefined>()
  const [width, setWidth] = useState("auto")
  const [ready, setReady] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const inRef = useRef<HTMLSpanElement>(null)
  const outRef = useRef<HTMLSpanElement>(null)
  const rootRef = useRef<HTMLSpanElement>(null)
  const frame = useRef<number | null>(null)

  const win = () => inRef.current?.scrollWidth ?? 0
  const wout = () => outRef.current?.scrollWidth ?? 0
  const grow = props.growOnly ?? true

  const widen = (next: number) => {
    if (next <= 0) return
    if (grow) {
      const prev = Number.parseFloat(width)
      if (Number.isFinite(prev) && next <= prev) return
    }
    setWidth(`${next}px`)
  }

  useEffect(() => {
    const next = props.text
    const prev = cur
    if (next === prev) return
    if (typeof next === "string" && typeof prev === "string" && next.startsWith(prev)) {
      setCur(next)
      widen(win())
      return
    }
    setSwapping(true)
    setOld(prev)
    setCur(next)
    if (typeof requestAnimationFrame !== "function") {
      widen(Math.max(win(), wout()))
      rootRef.current?.offsetHeight
      setSwapping(false)
      return
    }
    if (frame.current !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      widen(Math.max(win(), wout()))
      rootRef.current?.offsetHeight
      setSwapping(false)
      frame.current = null
    })
  }, [props.text])

  useEffect(() => {
    widen(win())
    if (typeof requestAnimationFrame !== "function") {
      setReady(true)
      return
    }
    const fonts = typeof document !== "undefined" ? document.fonts : undefined
    if (!fonts) {
      requestAnimationFrame(() => setReady(true))
      return
    }
    fonts.ready.finally(() => {
      widen(win())
      requestAnimationFrame(() => setReady(true))
    })
  }, [])

  useEffect(
    () => () => {
      if (frame.current === null || typeof cancelAnimationFrame !== "function") return
      cancelAnimationFrame(frame.current)
    },
    [],
  )

  return (
    <span
      ref={rootRef}
      data-component="text-reveal"
      data-ready={ready ? "true" : "false"}
      data-swapping={swapping ? "true" : "false"}
      data-truncate={props.truncate ? "true" : "false"}
      className={clsx(props.className)}
      aria-label={props.text ?? ""}
      style={
        {
          "--text-reveal-duration": ms(props.duration, 450),
          "--text-reveal-edge": pct(props.edge, 17),
          "--text-reveal-travel": px(props.travel, 0),
          "--text-reveal-spring": props.spring ?? "cubic-bezier(0.34, 1.08, 0.64, 1)",
          "--text-reveal-spring-soft": props.springSoft ?? "cubic-bezier(0.34, 1, 0.64, 1)",
        } as CSSProperties
      }
    >
      <span data-slot="text-reveal-track" style={{ width: props.truncate ? "100%" : width }}>
        <span ref={inRef} data-slot="text-reveal-entering">
          {cur ?? "\u00A0"}
        </span>
        <span ref={outRef} data-slot="text-reveal-leaving">
          {old ?? "\u00A0"}
        </span>
      </span>
    </span>
  )
}
