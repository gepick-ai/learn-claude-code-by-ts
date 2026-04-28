import { clsx } from "clsx"
import { type ComponentPropsWithoutRef, type ElementType, useEffect, useState } from "react"

export type TypewriterProps<T extends ElementType = "p"> = {
  text?: string
  as?: T
  className?: string
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">

export function Typewriter<T extends ElementType = "p">(props: TypewriterProps<T>) {
  const { text, as, className, ...rest } = props
  const [typing, setTyping] = useState(false)
  const [displayed, setDisplayed] = useState("")
  const [cursor, setCursor] = useState(true)
  const Tag = (as ?? "p") as ElementType

  useEffect(() => {
    if (!text) return
    let i = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    setTyping(true)
    setDisplayed("")
    setCursor(true)

    const delay = () => {
      const random = Math.random()
      if (random < 0.05) return 150 + Math.random() * 100
      if (random < 0.15) return 80 + Math.random() * 60
      return 30 + Math.random() * 50
    }

    const type = () => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
        timers.push(setTimeout(type, delay()))
        return
      }
      setTyping(false)
      timers.push(setTimeout(() => setCursor(false), 2000))
    }

    timers.push(setTimeout(type, 200))
    return () => timers.forEach((timer) => clearTimeout(timer))
  }, [text])

  return (
    <Tag {...rest} data-component="typewriter" className={clsx(className)}>
      {displayed}
      {cursor ? <span className={clsx(!typing && "blinking-cursor")}>│</span> : null}
    </Tag>
  )
}
