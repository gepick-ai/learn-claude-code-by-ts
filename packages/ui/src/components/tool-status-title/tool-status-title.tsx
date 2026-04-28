import { clsx } from "clsx"
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import { TextShimmer } from "../text-shimmer"

function common(active: string, done: string) {
  const a = Array.from(active)
  const b = Array.from(done)
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return {
    prefix: a.slice(0, i).join(""),
    active: a.slice(i).join(""),
    done: b.slice(i).join(""),
  }
}

function contentWidth(el: HTMLSpanElement | null) {
  if (!el) return 0
  const range = document.createRange()
  range.selectNodeContents(el)
  return Math.ceil(range.getBoundingClientRect().width)
}

export interface ToolStatusTitleProps {
  active: boolean
  activeText: string
  doneText: string
  className?: string
  split?: boolean
}

export function ToolStatusTitle(props: ToolStatusTitleProps) {
  const split = useMemo(() => common(props.activeText, props.doneText), [props.activeText, props.doneText])
  const suffix = useMemo(
    () => (props.split ?? true) && split.prefix.length >= 2 && split.active.length > 0 && split.done.length > 0,
    [props.split, split],
  )
  const prefixLen = Array.from(split.prefix).length
  const activeTail = suffix ? split.active : props.activeText
  const doneTail = suffix ? split.done : props.doneText
  const [width, setWidth] = useState("auto")
  const [ready, setReady] = useState(false)
  const activeRef = useRef<HTMLSpanElement>(null)
  const doneRef = useRef<HTMLSpanElement>(null)
  const frame = useRef<number | null>(null)
  const readyFrame = useRef<number | null>(null)

  const measure = () => {
    const target = props.active ? activeRef.current : doneRef.current
    const px = contentWidth(target)
    if (px > 0) setWidth(`${px}px`)
  }

  useEffect(() => {
    if (typeof requestAnimationFrame !== "function") {
      measure()
      return
    }
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      measure()
    })
  }, [props.active, activeTail, doneTail, suffix])

  useEffect(() => {
    measure()
    const finish = () => {
      if (typeof requestAnimationFrame !== "function") {
        setReady(true)
        return
      }
      if (readyFrame.current !== null) cancelAnimationFrame(readyFrame.current)
      readyFrame.current = requestAnimationFrame(() => {
        readyFrame.current = null
        setReady(true)
      })
    }
    const fonts = typeof document !== "undefined" ? document.fonts : undefined
    if (!fonts) {
      finish()
      return
    }
    fonts.ready.finally(() => {
      measure()
      finish()
    })
  }, [])

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      if (readyFrame.current !== null) cancelAnimationFrame(readyFrame.current)
    },
    [],
  )

  return (
    <span
      data-component="tool-status-title"
      data-active={props.active ? "true" : "false"}
      data-ready={ready ? "true" : "false"}
      data-mode={suffix ? "suffix" : "swap"}
      className={clsx(props.className)}
      aria-label={props.active ? props.activeText : props.doneText}
    >
      {suffix ? (
        <span data-slot="tool-status-suffix">
          <span data-slot="tool-status-prefix">
            <TextShimmer text={split.prefix} active={props.active} offset={0} />
          </span>
          <span data-slot="tool-status-tail" style={{ width } as CSSProperties}>
            <span data-slot="tool-status-active" ref={activeRef}>
              <TextShimmer text={activeTail} active={props.active} offset={prefixLen} />
            </span>
            <span data-slot="tool-status-done" ref={doneRef}>
              <TextShimmer text={doneTail} active={false} offset={prefixLen} />
            </span>
          </span>
        </span>
      ) : (
        <span data-slot="tool-status-swap" style={{ width } as CSSProperties}>
          <span data-slot="tool-status-active" ref={activeRef}>
            <TextShimmer text={activeTail} active={props.active} offset={0} />
          </span>
          <span data-slot="tool-status-done" ref={doneRef}>
            <TextShimmer text={doneTail} active={false} offset={0} />
          </span>
        </span>
      )}
    </span>
  )
}
