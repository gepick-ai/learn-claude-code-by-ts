import { clsx } from "clsx"
import { forwardRef, type ButtonHTMLAttributes, type Ref } from "react"
import { Icon, type IconName } from "../icon"

export type ButtonSize = "small" | "normal" | "large"
export type ButtonVariant = "primary" | "secondary" | "ghost"

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize
  variant?: ButtonVariant
  icon?: IconName
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, type = "button", variant = "secondary", size = "normal", icon, children, ...rest },
  ref: Ref<HTMLButtonElement>,
) {
  return (
    <button
      type={type}
      data-component="button"
      data-size={size}
      data-variant={variant}
      data-icon={icon}
      className={clsx(className)}
      ref={ref}
      {...rest}
    >
      {icon ? <Icon name={icon} size="small" /> : null}
      {children ? <span data-slot="content">{children}</span> : null}
    </button>
  )
})
