import * as ProgressPrimitive from "@radix-ui/react-progress"
import { clsx } from "clsx"
import { type ComponentProps, type ReactNode } from "react"

export interface ProgressProps extends ComponentProps<typeof ProgressPrimitive.Root> {
  hideLabel?: boolean
  showValueLabel?: boolean
  children?: ReactNode
}

export function Progress(props: ProgressProps) {
  const { className, hideLabel, showValueLabel, children, value, max = 100, ...rest } = props
  const percent = typeof value === "number" ? Math.round((value / max) * 100) : undefined
  const indeterminate = typeof value !== "number"
  return (
    <ProgressPrimitive.Root
      {...rest}
      value={typeof value === "number" ? value : undefined}
      max={max}
      data-component="progress"
      data-indeterminate={indeterminate || undefined}
      className={clsx(className)}
    >
      {children || showValueLabel ? (
        <div data-slot="progress-header">
          {children ? (
            <span
              data-slot="progress-label"
              style={
                hideLabel
                  ? {
                      position: "absolute",
                      width: 1,
                      height: 1,
                      padding: 0,
                      margin: -1,
                      overflow: "hidden",
                      clip: "rect(0, 0, 0, 0)",
                      whiteSpace: "nowrap",
                      borderWidth: 0,
                    }
                  : undefined
              }
            >
              {children}
            </span>
          ) : null}
          {showValueLabel ? <span data-slot="progress-value-label">{percent ?? ""}%</span> : null}
        </div>
      ) : null}
      <ProgressPrimitive.Indicator
        data-slot="progress-track"
        style={
          typeof value === "number"
            ? {
                ["--kb-progress-fill-width" as "--kb-progress-fill-width"]: `${Math.max(0, Math.min(100, (value / max) * 100))}%`,
              } as unknown as ComponentProps<typeof ProgressPrimitive.Indicator>["style"]
            : undefined
        }
      >
        <span data-slot="progress-fill" />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  )
}
