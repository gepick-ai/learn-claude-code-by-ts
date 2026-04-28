import { clsx } from "clsx"
import { type ComponentProps } from "react"

export interface TagProps extends ComponentProps<"span"> {
  size?: "normal" | "large"
}

export function Tag(props: TagProps) {
  const { size = "normal", className, children, ...rest } = props
  return (
    <span {...rest} data-component="tag" data-size={size} className={clsx(className)}>
      {children}
    </span>
  )
}
