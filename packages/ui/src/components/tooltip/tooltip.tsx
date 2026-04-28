import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { type CSSProperties, type ReactNode, useState } from "react"

export interface TooltipProps extends Omit<TooltipPrimitive.TooltipProps, "children"> {
  value: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  contentStyle?: CSSProperties
  inactive?: boolean
  forceOpen?: boolean
}

export interface TooltipKeybindProps extends Omit<TooltipProps, "value"> {
  title: string
  keybind: string
}

export function TooltipKeybind(props: TooltipKeybindProps) {
  const { title, keybind, ...rest } = props
  return (
    <Tooltip
      {...rest}
      value={
        <div data-slot="tooltip-keybind">
          <span>{title}</span>
          <span data-slot="tooltip-keybind-key">{keybind}</span>
        </div>
      }
    />
  )
}

export function Tooltip(props: TooltipProps) {
  const [open, setOpen] = useState(false)
  const { children, className, contentClassName, contentStyle, inactive, forceOpen, value, ...rest } = props

  if (inactive) return <>{children}</>

  return (
    <TooltipPrimitive.Provider delayDuration={100}>
      <TooltipPrimitive.Root
        {...rest}
        delayDuration={0}
        open={forceOpen || open}
        onOpenChange={setOpen}
      >
        <TooltipPrimitive.Trigger asChild>
          <div data-component="tooltip-trigger" className={className}>
            {children}
          </div>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={4}
            data-component="tooltip"
            data-force-open={forceOpen}
            className={contentClassName}
            style={contentStyle}
          >
            {value}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

