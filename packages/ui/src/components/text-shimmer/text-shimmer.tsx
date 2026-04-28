import { clsx } from "clsx"
import { type CSSProperties, type ComponentPropsWithoutRef, type ElementType, useEffect, useMemo, useState } from "react"

export type TextShimmerProps<T extends ElementType = "span"> = {
  text: string
  as?: T
  active?: boolean
  offset?: number
  className?: string
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">

export function TextShimmer<T extends ElementType = "span">(props: TextShimmerProps<T>) {
  const { text, as, active = true, offset = 0, className, ...rest } = props
  const [run, setRun] = useState(active)
  const swap = 220
  const Tag = (as ?? "span") as ElementType
  const label = useMemo(() => text ?? "", [text])

  useEffect(() => {
    if (active) {
      setRun(true)
      return
    }
    const timer = setTimeout(() => setRun(false), swap)
    return () => clearTimeout(timer)
  }, [active])

  return (
    <Tag
      {...rest}
      data-component="text-shimmer"
      data-active={active ? "true" : "false"}
      className={clsx(className)}
      aria-label={label}
      style={
        {
          "--text-shimmer-swap": `${swap}ms`,
          "--text-shimmer-index": `${offset}`,
          ...((rest as { style?: CSSProperties }).style ?? {}),
        } as CSSProperties
      }
    >
      <span data-slot="text-shimmer-char">
        <span data-slot="text-shimmer-char-base" aria-hidden="true">
          {label}
        </span>
        <span data-slot="text-shimmer-char-shimmer" data-run={run ? "true" : "false"} aria-hidden="true">
          {label}
        </span>
      </span>
    </Tag>
  )
}
