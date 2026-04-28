import { attachSpring, motionValue, type SpringOptions } from "motion"
import { useEffect, useMemo, useRef, useState } from "react"

type Opt = Partial<Pick<SpringOptions, "visualDuration" | "bounce" | "stiffness" | "damping" | "mass" | "velocity">>

const eq = (a: Opt | undefined, b: Opt | undefined) =>
  a?.visualDuration === b?.visualDuration &&
  a?.bounce === b?.bounce &&
  a?.stiffness === b?.stiffness &&
  a?.damping === b?.damping &&
  a?.mass === b?.mass &&
  a?.velocity === b?.velocity

export function useSpring(target: number, options?: Opt | (() => Opt)) {
  const read = () => (typeof options === "function" ? options() : options)
  const [value, setValue] = useState(target)
  const source = useMemo(() => motionValue(target), [])
  const spring = useMemo(() => motionValue(target), [])
  const cfg = useRef<Opt | undefined>(read())
  const stop = useRef(attachSpring(spring, source, cfg.current))

  useEffect(() => {
    const off = spring.on("change", (next: number) => setValue(next))
    return off
  }, [spring])

  useEffect(() => {
    source.set(target)
  }, [source, target])

  useEffect(() => {
    if (!options) return
    const next = read()
    if (eq(cfg.current, next)) return
    cfg.current = next
    stop.current()
    stop.current = attachSpring(spring, source, next)
    setValue(spring.get())
  }, [options, source, spring, target])

  useEffect(
    () => () => {
      stop.current()
      spring.destroy()
      source.destroy()
    },
    [source, spring],
  )

  return value
}
