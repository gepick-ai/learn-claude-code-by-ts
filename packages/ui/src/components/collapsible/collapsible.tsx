import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { clsx } from "clsx"
import { type ComponentProps } from "react"
import { Icon } from "../icon"

export interface CollapsibleProps extends ComponentProps<typeof CollapsiblePrimitive.Root> {
  variant?: "normal" | "ghost"
}

function CollapsibleRoot(props: CollapsibleProps) {
  const { variant = "normal", className, ...rest } = props
  return (
    <CollapsiblePrimitive.Root
      data-component="collapsible"
      data-variant={variant}
      className={clsx(className)}
      {...rest}
    />
  )
}

function CollapsibleTrigger(props: ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
}

function CollapsibleContent(props: ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return <CollapsiblePrimitive.Content data-slot="collapsible-content" {...props} />
}

function CollapsibleArrow(props?: ComponentProps<"div">) {
  return (
    <div data-slot="collapsible-arrow" {...(props || {})}>
      <span data-slot="collapsible-arrow-icon">
        <Icon name="chevron-down" size="small" />
      </span>
    </div>
  )
}

export const Collapsible = Object.assign(CollapsibleRoot, {
  Arrow: CollapsibleArrow,
  Trigger: CollapsibleTrigger,
  Content: CollapsibleContent,
})
