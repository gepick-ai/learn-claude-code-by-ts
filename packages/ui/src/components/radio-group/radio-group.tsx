import { clsx } from "clsx"
import { type CSSProperties, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react"

export type RadioGroupProps<T> = {
  options: T[]
  current?: T
  defaultValue?: T
  value?: (x: T) => string
  label?: (x: T) => ReactNode
  onSelect?: (value: T | undefined) => void
  className?: string
  size?: "small" | "medium"
  fill?: boolean
  pad?: "none" | "normal"
  disabled?: boolean
}

export function RadioGroup<T>(props: RadioGroupProps<T>) {
  const [inner, setInner] = useState<T | undefined>(props.defaultValue)
  const [style, setStyle] = useState<CSSProperties>()
  const wrap = useRef<HTMLDivElement>(null)
  const uid = useId()
  const getValue = (item: T) => (props.value ? props.value(item) : String(item))
  const getLabel = (item: T) => (props.label ? props.label(item) : String(item))
  const picked = props.current ?? inner
  const pickedValue = picked ? getValue(picked) : undefined
  const index = useMemo(() => props.options.findIndex((opt) => getValue(opt) === pickedValue), [props.options, pickedValue])

  useEffect(() => {
    const root = wrap.current
    if (!root || index < 0) {
      setStyle(undefined)
      return
    }
    const items = Array.from(root.querySelectorAll('[data-slot="radio-group-item"]'))
    const item = items[index]
    if (!(item instanceof HTMLElement)) {
      setStyle(undefined)
      return
    }
    const box = root.getBoundingClientRect()
    const rect = item.getBoundingClientRect()
    setStyle({
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transform: `translate3d(${rect.left - box.left}px, ${rect.top - box.top}px, 0)`,
      opacity: 1,
    })
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => {
      const nextBox = root.getBoundingClientRect()
      const nextRect = item.getBoundingClientRect()
      setStyle({
        width: `${nextRect.width}px`,
        height: `${nextRect.height}px`,
        transform: `translate3d(${nextRect.left - nextBox.left}px, ${nextRect.top - nextBox.top}px, 0)`,
        opacity: 1,
      })
    })
    observer.observe(root)
    observer.observe(item)
    return () => observer.disconnect()
  }, [index, props.options])

  return (
    <div
      role="radiogroup"
      data-component="radio-group"
      data-size={props.size ?? "medium"}
      data-fill={props.fill ? "" : undefined}
      data-pad={props.pad ?? "normal"}
      data-disabled={props.disabled || undefined}
      className={clsx(props.className)}
    >
      <div role="presentation" data-slot="radio-group-wrapper" ref={wrap}>
        <span data-slot="radio-group-indicator" style={style} />
        <div role="presentation" data-slot="radio-group-items">
          {props.options.map((option) => {
            const val = getValue(option)
            const checked = val === pickedValue
            const id = `${uid}-${val}`
            return (
              <div key={val} data-slot="radio-group-item" data-value={val}>
                <input
                  id={id}
                  name={uid}
                  data-slot="radio-group-item-input"
                  type="radio"
                  checked={checked}
                  disabled={props.disabled}
                  onChange={() => {
                    setInner(option)
                    props.onSelect?.(option)
                  }}
                />
                <label htmlFor={id} data-slot="radio-group-item-label">
                  <span data-slot="radio-group-item-control">{getLabel(option)}</span>
                </label>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
