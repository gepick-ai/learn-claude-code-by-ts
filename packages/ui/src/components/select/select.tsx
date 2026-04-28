import * as SelectPrimitive from "@radix-ui/react-select"
import { clsx } from "clsx"
import { type CSSProperties, type ReactNode, useMemo, useRef } from "react"
import { Button, type ButtonProps } from "../button"
import { Icon } from "../icon"

export type SelectProps<T> = Omit<ButtonProps, "children" | "value" | "onSelect"> & {
  placeholder?: string
  options: T[]
  current?: T
  value?: (x: T) => string
  label?: (x: T) => string
  groupBy?: (x: T) => string
  valueClass?: string
  onSelect?: (value: T | undefined) => void
  onHighlight?: (value: T | undefined) => (() => void) | void
  onOpenChange?: (open: boolean) => void
  className?: string
  children?: (item: T | undefined) => ReactNode
  triggerStyle?: CSSProperties
  triggerVariant?: "settings"
}

export function Select<T>(props: SelectProps<T>) {
  const stopRef = useRef<(() => void) | void>(undefined)
  const keyRef = useRef<string | undefined>(undefined)
  const map = useMemo(() => {
    const kv = new Map<string, T>()
    props.options.forEach((item) => kv.set(props.value ? props.value(item) : String(item), item))
    return kv
  }, [props.options, props.value])
  const grouped = useMemo(() => {
    const list = new Map<string, T[]>()
    props.options.forEach((item) => {
      const key = props.groupBy ? props.groupBy(item) : ""
      const group = list.get(key)
      if (!group) {
        list.set(key, [item])
        return
      }
      group.push(item)
    })
    return Array.from(list.entries()).map(([category, options]) => ({ category, options }))
  }, [props.groupBy, props.options])

  const stop = () => {
    stopRef.current?.()
    stopRef.current = undefined
    keyRef.current = undefined
  }
  const keyFor = (item: T) => (props.value ? props.value(item) : String(item))
  const move = (item: T | undefined) => {
    if (!props.onHighlight) return
    if (!item) {
      stop()
      return
    }
    const key = keyFor(item)
    if (keyRef.current === key) return
    stopRef.current?.()
    stopRef.current = props.onHighlight(item)
    keyRef.current = key
  }
  const current = props.current ? keyFor(props.current) : undefined
  const text = (item: T) => (props.label ? props.label(item) : String(item))
  const icon = props.triggerVariant === "settings" ? "selector" : "chevron-down"

  return (
    <SelectPrimitive.Root
      value={current}
      onValueChange={(next) => {
        const val = next as string
        props.onSelect?.(val ? map.get(val) : undefined)
        stop()
      }}
      onOpenChange={(open: boolean) => {
        props.onOpenChange?.(open)
        if (!open) stop()
      }}
    >
      <div data-component="select" data-trigger-style={props.triggerVariant}>
        <SelectPrimitive.Trigger asChild disabled={props.disabled} data-slot="select-select-trigger">
          <Button
            size={props.size}
            variant={props.variant}
            className={clsx(props.className)}
            style={props.triggerStyle}
            disabled={props.disabled}
          >
            <SelectPrimitive.Value className={clsx(props.valueClass)} data-slot="select-select-trigger-value" placeholder={props.placeholder}>
              {current ? text(map.get(current) as T) : props.placeholder || ""}
            </SelectPrimitive.Value>
            <SelectPrimitive.Icon data-slot="select-select-trigger-icon">
              <Icon name={icon} size="small" />
            </SelectPrimitive.Icon>
          </Button>
        </SelectPrimitive.Trigger>
      </div>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content data-component="select-content" data-trigger-style={props.triggerVariant} position="popper" sideOffset={4}>
          <SelectPrimitive.Viewport data-slot="select-select-content-list">
            {grouped.map((group) => (
              <SelectPrimitive.Group key={group.category || "default"}>
                {group.category ? <SelectPrimitive.Label data-slot="select-section">{group.category}</SelectPrimitive.Label> : null}
                {group.options.map((item) => {
                  const key = keyFor(item)
                  return (
                    <SelectPrimitive.Item
                      key={key}
                      value={key}
                      data-slot="select-select-item"
                      className={clsx(props.className)}
                      onPointerEnter={() => move(item)}
                      onPointerMove={() => move(item)}
                      onFocus={() => move(item)}
                    >
                      <SelectPrimitive.ItemText data-slot="select-select-item-label">
                        {props.children ? props.children(item) : text(item)}
                      </SelectPrimitive.ItemText>
                      <SelectPrimitive.ItemIndicator data-slot="select-select-item-indicator">
                        <Icon name="check-small" size="small" />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  )
                })}
              </SelectPrimitive.Group>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
