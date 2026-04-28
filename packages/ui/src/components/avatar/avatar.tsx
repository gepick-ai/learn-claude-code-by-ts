import { clsx } from "clsx"
import { type ComponentProps } from "react"

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : undefined

function first(value: string) {
  if (!value) return ""
  if (!segmenter) return Array.from(value)[0] ?? ""
  return segmenter.segment(value)[Symbol.iterator]().next().value?.segment ?? Array.from(value)[0] ?? ""
}

export interface AvatarProps extends ComponentProps<"div"> {
  fallback: string
  src?: string
  background?: string
  foreground?: string
  size?: "small" | "normal" | "large"
}

export function Avatar(props: AvatarProps) {
  const { fallback, src, background, foreground, size = "normal", className, style, ...rest } = props
  return (
    <div
      {...rest}
      data-component="avatar"
      data-size={size}
      data-has-image={src ? "" : undefined}
      className={clsx(className)}
      style={{
        ...(typeof style === "object" ? style : {}),
        ...(!src && background ? ({ "--avatar-bg": background } as const) : {}),
        ...(!src && foreground ? ({ "--avatar-fg": foreground } as const) : {}),
      }}
    >
      {src ? <img src={src} draggable={false} data-slot="avatar-image" /> : first(fallback)}
    </div>
  )
}
