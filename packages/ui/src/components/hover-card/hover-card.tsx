import * as HoverCardPrimitive from "@radix-ui/react-hover-card"
import { clsx } from "clsx"
import { type ComponentProps, type ReactNode } from "react"

export interface HoverCardProps extends Omit<ComponentProps<typeof HoverCardPrimitive.Root>, "children"> {
  trigger: ReactNode
  mount?: HTMLElement
  className?: string
  children?: ReactNode
}

export function HoverCard(props: HoverCardProps) {
  const { trigger, mount, className, children, ...rest } = props
  return (
    <HoverCardPrimitive.Root openDelay={700} closeDelay={300} {...rest}>
      <HoverCardPrimitive.Trigger asChild data-slot="hover-card-trigger">
        <div data-slot="hover-card-trigger">{trigger}</div>
      </HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal container={mount}>
        <HoverCardPrimitive.Content data-component="hover-card-content" className={clsx(className)} sideOffset={4}>
          <div data-slot="hover-card-body">{children}</div>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  )
}
