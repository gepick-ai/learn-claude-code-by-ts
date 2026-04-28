import { clsx } from "clsx"
import { type ComponentProps, type ReactNode } from "react"

export interface KeybindProps extends ComponentProps<"span"> {
  children?: ReactNode
}

export function Keybind(props: KeybindProps) {
  const { className, children, ...rest } = props
  return (
    <span data-component="keybind" className={clsx(className)} {...rest}>
      {children}
    </span>
  )
}
