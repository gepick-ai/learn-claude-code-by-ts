import { clsx } from "clsx"
import { forwardRef, type ButtonHTMLAttributes, type Ref } from "react"
import { Icon, type IconName, type IconSize } from "../icon"

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  size?: "small" | "normal" | "large"
  iconSize?: IconSize
  variant?: "primary" | "secondary" | "ghost"
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, type = "button", variant = "secondary", size = "normal", iconSize, icon, ...rest },
  ref: Ref<HTMLButtonElement>,
) {
  return (
    <button
      type={type}
      data-component="icon-button"
      data-icon={icon}
      data-size={size}
      data-variant={variant}
      className={clsx(className)}
      ref={ref}
      {...rest}
    >
      <Icon name={icon} size={iconSize ?? (size === "large" ? "normal" : "small")} />
    </button>
  )
})
