import { Fragment, useMemo } from "react"
import { clsx } from "clsx"
import { AnimatedCountLabel } from "../tool-count-label"

export type CountItem = {
  key: string
  count: number
  one: string
  other: string
}

export interface AnimatedCountListProps {
  items: CountItem[]
  fallback?: string
  className?: string
}

export function AnimatedCountList(props: AnimatedCountListProps) {
  const visible = useMemo(() => props.items.filter((item) => item.count > 0), [props.items])
  const fallback = props.fallback ?? ""
  const showEmpty = visible.length === 0 && fallback.length > 0

  return (
    <span data-component="tool-count-summary" className={clsx(props.className)}>
      <span data-slot="tool-count-summary-empty" data-active={showEmpty ? "true" : "false"}>
        <span data-slot="tool-count-summary-empty-inner">{fallback}</span>
      </span>

      {props.items.map((item, index) => {
        const active = item.count > 0
        const hasPrev = props.items.slice(0, index).some((v) => v.count > 0)
        return (
          <Fragment key={item.key}>
            <span data-slot="tool-count-summary-prefix" data-active={active && hasPrev ? "true" : "false"}>
              ,
            </span>
            <span data-slot="tool-count-summary-item" data-active={active ? "true" : "false"}>
              <span data-slot="tool-count-summary-item-inner">
                <AnimatedCountLabel one={item.one} other={item.other} count={Math.max(0, Math.round(item.count))} />
              </span>
            </span>
          </Fragment>
        )
      })}
    </span>
  )
}
