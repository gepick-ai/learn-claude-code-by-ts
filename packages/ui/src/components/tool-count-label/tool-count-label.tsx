import { clsx } from "clsx"
import { useMemo } from "react"
import { AnimatedNumber } from "../animated-number"

function split(text: string) {
  const match = /{{\s*count\s*}}/.exec(text)
  if (!match) return { before: "", after: text }
  if (match.index === undefined) return { before: "", after: text }
  return {
    before: text.slice(0, match.index),
    after: text.slice(match.index + match[0].length),
  }
}

function common(one: string, other: string) {
  const a = Array.from(one)
  const b = Array.from(other)
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return {
    stem: a.slice(0, i).join(""),
    one: a.slice(i).join(""),
    other: b.slice(i).join(""),
  }
}

export interface AnimatedCountLabelProps {
  count: number
  one: string
  other: string
  className?: string
}

export function AnimatedCountLabel(props: AnimatedCountLabelProps) {
  const one = useMemo(() => split(props.one), [props.one])
  const other = useMemo(() => split(props.other), [props.other])
  const singular = Math.round(props.count) === 1
  const active = singular ? one : other
  const suffix = useMemo(() => common(one.after, other.after), [one.after, other.after])
  const splitSuffix = one.before === other.before && (one.after.startsWith(other.after) || other.after.startsWith(one.after))
  const before = splitSuffix ? one.before : active.before
  const stem = splitSuffix ? suffix.stem : active.after
  const tail = !splitSuffix ? "" : singular ? suffix.one : suffix.other
  const showTail = splitSuffix && tail.length > 0

  return (
    <span data-component="tool-count-label" className={clsx(props.className)}>
      <span data-slot="tool-count-label-before">{before}</span>
      <AnimatedNumber value={props.count} />
      <span data-slot="tool-count-label-word">
        <span data-slot="tool-count-label-stem">{stem}</span>
        <span data-slot="tool-count-label-suffix" data-active={showTail ? "true" : "false"}>
          <span data-slot="tool-count-label-suffix-inner">{tail}</span>
        </span>
      </span>
    </span>
  )
}
