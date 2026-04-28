import { clsx } from "clsx"
import { type CSSProperties } from "react"
import { useEffect, useMemo, useState } from "react"

const TRACK = Array.from({ length: 30 }, (_, i) => i % 10)
const DURATION = 600

function normalize(value: number) {
  return ((value % 10) + 10) % 10
}

function spin(from: number, to: number, direction: 1 | -1) {
  if (from === to) return 0
  if (direction > 0) return (to - from + 10) % 10
  return -((from - to + 10) % 10)
}

function Digit(props: { value: number; direction: 1 | -1 }) {
  const [step, setStep] = useState(props.value + 10)
  const [animating, setAnimating] = useState(false)
  const [last, setLast] = useState(props.value)

  useEffect(() => {
    const delta = spin(last, props.value, props.direction)
    setLast(props.value)
    if (!delta) {
      setAnimating(false)
      setStep(props.value + 10)
      return
    }
    setAnimating(true)
    setStep((v) => v + delta)
  }, [props.direction, props.value, last])

  return (
    <span data-slot="animated-number-digit">
      <span
        data-slot="animated-number-strip"
        data-animating={animating ? "true" : "false"}
        onTransitionEnd={() => {
          setAnimating(false)
          setStep((v) => normalize(v) + 10)
        }}
        style={
          {
            "--animated-number-offset": `${step}`,
            "--animated-number-duration": `var(--tool-motion-odometer-ms, ${DURATION}ms)`,
          } as CSSProperties
        }
      >
        {TRACK.map((value, i) => (
          <span key={`${value}-${i}`} data-slot="animated-number-cell">
            {value}
          </span>
        ))}
      </span>
    </span>
  )
}

export interface AnimatedNumberProps {
  value: number
  className?: string
}

export function AnimatedNumber(props: AnimatedNumberProps) {
  const target = useMemo(() => (Number.isFinite(props.value) ? Math.max(0, Math.round(props.value)) : 0), [props.value])
  const [value, setValue] = useState(target)
  const [direction, setDirection] = useState<1 | -1>(1)

  useEffect(() => {
    if (target === value) return
    setDirection(target > value ? 1 : -1)
    setValue(target)
  }, [target, value])

  const label = value.toString()
  const digits = useMemo(
    () =>
      Array.from(label, (char) => {
        const code = char.charCodeAt(0) - 48
        if (code < 0 || code > 9) return 0
        return code
      }).reverse(),
    [label],
  )
  const width = `${digits.length}ch`

  return (
    <span data-component="animated-number" className={clsx(props.className)} aria-label={label}>
      <span data-slot="animated-number-value" style={{ "--animated-number-width": width } as CSSProperties}>
        {digits.map((digit, i) => (
          <Digit key={i} value={digit} direction={direction} />
        ))}
      </span>
    </span>
  )
}
