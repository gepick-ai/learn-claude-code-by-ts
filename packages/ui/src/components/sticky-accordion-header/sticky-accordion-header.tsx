import { clsx } from "clsx"
import { type ComponentProps, type ReactNode } from "react"
import { Accordion } from "../accordion"

export type StickyAccordionHeaderProps = ComponentProps<typeof Accordion.Header> & {
  children?: ReactNode
}

export function StickyAccordionHeader(props: StickyAccordionHeaderProps) {
  const { className, children, ...rest } = props
  return (
    <Accordion.Header {...rest} data-component="sticky-accordion-header" className={clsx(className)}>
      {children}
    </Accordion.Header>
  )
}
