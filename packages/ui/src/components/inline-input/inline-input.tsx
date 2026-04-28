import { clsx } from "clsx"
import { type ComponentProps } from "react"

export type InlineInputProps = ComponentProps<"input"> & {
  width?: string
}

export function InlineInput(props: InlineInputProps) {
  const { className, width, style, ...rest } = props
  const merged = () => {
    if (!style) return { width }
    if (typeof style === "string") {
      if (!width) return style
      return `${style};width:${width}`
    }
    if (!width) return style
    return { ...style, width }
  }

  return (
    <input
      data-component="inline-input"
      className={clsx(className)}
      style={merged() as unknown as ComponentProps<"input">["style"]}
      {...rest}
    />
  )
}
