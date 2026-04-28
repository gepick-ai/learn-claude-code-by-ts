import { clsx } from "clsx"
import { type ComponentProps, useMemo } from "react"

export interface ProgressCircleProps extends Pick<ComponentProps<"svg">, "className"> {
  percentage: number
  size?: number
  strokeWidth?: number
}

export function ProgressCircle(props: ProgressCircleProps) {
  const { percentage, size = 16, strokeWidth = 3, className } = props
  const viewBoxSize = 16
  const center = viewBoxSize / 2
  const radius = center - strokeWidth / 2
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius])
  const offset = useMemo(() => {
    const clamped = Math.max(0, Math.min(100, percentage || 0))
    return circumference * (1 - clamped / 100)
  }, [circumference, percentage])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      fill="none"
      data-component="progress-circle"
      className={clsx(className)}
    >
      <circle cx={center} cy={center} r={radius} data-slot="progress-circle-background" strokeWidth={strokeWidth} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        data-slot="progress-circle-progress"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference.toString()}
        strokeDashoffset={offset}
      />
    </svg>
  )
}
