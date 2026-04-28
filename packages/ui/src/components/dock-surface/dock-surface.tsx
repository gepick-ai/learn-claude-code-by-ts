import { clsx } from "clsx"
import { type ComponentProps } from "react"

export interface DockTrayProps extends ComponentProps<"div"> {
  attach?: "none" | "top"
}

export function DockShell(props: ComponentProps<"div">) {
  const { className, children, ...rest } = props
  return (
    <div {...rest} data-dock-surface="shell" className={clsx(className)}>
      {children}
    </div>
  )
}

export function DockShellForm(props: ComponentProps<"form">) {
  const { className, children, ...rest } = props
  return (
    <form {...rest} data-dock-surface="shell" className={clsx(className)}>
      {children}
    </form>
  )
}

export function DockTray(props: DockTrayProps) {
  const { attach = "none", className, children, ...rest } = props
  return (
    <div {...rest} data-dock-surface="tray" data-dock-attach={attach} className={clsx(className)}>
      {children}
    </div>
  )
}
