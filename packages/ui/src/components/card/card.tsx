import { clsx } from "clsx"
import { type ComponentProps } from "react"
import { Icon, type IconName } from "../icon"

type Variant = "normal" | "error" | "warning" | "success" | "info"

export interface CardProps extends ComponentProps<"div"> {
  variant?: Variant
}

export interface CardTitleProps extends ComponentProps<"div"> {
  variant?: Variant
  icon?: IconName | false | null
}

function pick(variant: Variant) {
  if (variant === "error") return "circle-ban-sign" as const
  if (variant === "warning") return "warning" as const
  if (variant === "success") return "circle-check" as const
  if (variant === "info") return "help" as const
  return
}

function mix(style: ComponentProps<"div">["style"], value?: string): ComponentProps<"div">["style"] {
  if (!value) return style
  if (!style) return { "--card-accent": value } as ComponentProps<"div">["style"]
  if (typeof style === "string") return `${style};--card-accent:${value};` as ComponentProps<"div">["style"]
  return { ...(style as Record<string, string | number>), "--card-accent": value } as ComponentProps<"div">["style"]
}

export function Card(props: CardProps) {
  const { variant = "normal", style, className, children, ...rest } = props
  const accent = () => {
    if (variant === "error") return "var(--icon-critical-base)"
    if (variant === "warning") return "var(--icon-warning-active)"
    if (variant === "success") return "var(--icon-success-active)"
    if (variant === "info") return "var(--icon-info-active)"
    return
  }
  return (
    <div
      {...rest}
      data-component="card"
      data-variant={variant}
      style={mix(style, accent())}
      className={clsx(className)}
    >
      {children}
    </div>
  )
}

export function CardTitle(props: CardTitleProps) {
  const { variant = "normal", icon, className, children, ...rest } = props
  const show = icon !== false && icon !== null
  const name = () => {
    if (icon === false || icon === null) return
    if (typeof icon === "string") return icon
    return pick(variant)
  }
  const placeholder = !name()
  return (
    <div {...rest} data-slot="card-title" className={clsx(className)}>
      {show ? (
        <span data-slot="card-title-icon" data-placeholder={placeholder || undefined}>
          <Icon name={name() ?? "dash"} size="small" />
        </span>
      ) : null}
      {children}
    </div>
  )
}

export function CardDescription(props: ComponentProps<"div">) {
  const { className, children, ...rest } = props
  return (
    <div {...rest} data-slot="card-description" className={clsx(className)}>
      {children}
    </div>
  )
}

export function CardActions(props: ComponentProps<"div">) {
  const { className, children, ...rest } = props
  return (
    <div {...rest} data-slot="card-actions" className={clsx(className)}>
      {children}
    </div>
  )
}
