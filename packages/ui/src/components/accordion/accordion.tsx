import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { clsx } from "clsx"
import { type ComponentProps, type ReactNode } from "react"

export type AccordionProps = ComponentProps<typeof AccordionPrimitive.Root> & {
  className?: string
  children?: ReactNode
}
export interface AccordionItemProps extends ComponentProps<typeof AccordionPrimitive.Item> {}
export interface AccordionHeaderProps extends ComponentProps<typeof AccordionPrimitive.Header> {}
export interface AccordionTriggerProps extends ComponentProps<typeof AccordionPrimitive.Trigger> {}
export interface AccordionContentProps extends ComponentProps<typeof AccordionPrimitive.Content> {}

function AccordionRoot(props: AccordionProps) {
  const { className, ...rest } = props
  return <AccordionPrimitive.Root {...rest} data-component="accordion" className={clsx(className)} />
}

function AccordionItem(props: AccordionItemProps) {
  const { className, ...rest } = props
  return <AccordionPrimitive.Item {...rest} data-slot="accordion-item" className={clsx(className)} />
}

function AccordionHeader(props: AccordionHeaderProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <AccordionPrimitive.Header {...rest} data-slot="accordion-header" className={clsx(className)}>
      {children}
    </AccordionPrimitive.Header>
  )
}

function AccordionTrigger(props: AccordionTriggerProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <AccordionPrimitive.Trigger {...rest} data-slot="accordion-trigger" className={clsx(className)}>
      {children}
    </AccordionPrimitive.Trigger>
  )
}

function AccordionContent(props: AccordionContentProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <AccordionPrimitive.Content {...rest} data-slot="accordion-content" className={clsx(className)}>
      {children}
    </AccordionPrimitive.Content>
  )
}

export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Header: AccordionHeader,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
})
