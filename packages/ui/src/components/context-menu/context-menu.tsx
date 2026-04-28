import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { clsx } from "clsx"
import { type ComponentProps, type ReactNode } from "react"

export interface ContextMenuProps extends ComponentProps<typeof ContextMenuPrimitive.Root> {}
export interface ContextMenuTriggerProps extends ComponentProps<typeof ContextMenuPrimitive.Trigger> {}
export interface ContextMenuIconProps extends ComponentProps<typeof ContextMenuPrimitive.ItemIndicator> {}
export interface ContextMenuPortalProps extends ComponentProps<typeof ContextMenuPrimitive.Portal> {}
export interface ContextMenuContentProps extends ComponentProps<typeof ContextMenuPrimitive.Content> {}
export interface ContextMenuArrowProps extends ComponentProps<typeof ContextMenuPrimitive.Arrow> {}
export interface ContextMenuSeparatorProps extends ComponentProps<typeof ContextMenuPrimitive.Separator> {}
export interface ContextMenuGroupProps extends ComponentProps<typeof ContextMenuPrimitive.Group> {}
export interface ContextMenuGroupLabelProps extends ComponentProps<typeof ContextMenuPrimitive.Label> {}
export interface ContextMenuItemProps extends ComponentProps<typeof ContextMenuPrimitive.Item> {}
export interface ContextMenuItemLabelProps extends ComponentProps<"span"> {}
export interface ContextMenuItemDescriptionProps extends ComponentProps<"span"> {}
export interface ContextMenuItemIndicatorProps extends ComponentProps<typeof ContextMenuPrimitive.ItemIndicator> {}
export interface ContextMenuRadioGroupProps extends ComponentProps<typeof ContextMenuPrimitive.RadioGroup> {}
export interface ContextMenuRadioItemProps extends ComponentProps<typeof ContextMenuPrimitive.RadioItem> {}
export interface ContextMenuCheckboxItemProps extends ComponentProps<typeof ContextMenuPrimitive.CheckboxItem> {}
export interface ContextMenuSubProps extends ComponentProps<typeof ContextMenuPrimitive.Sub> {}
export interface ContextMenuSubTriggerProps extends ComponentProps<typeof ContextMenuPrimitive.SubTrigger> {}
export interface ContextMenuSubContentProps extends ComponentProps<typeof ContextMenuPrimitive.SubContent> {}

function ContextMenuRoot(props: ContextMenuProps) {
  return <ContextMenuPrimitive.Root {...props} data-component="context-menu" />
}

function ContextMenuTrigger(props: ContextMenuTriggerProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <ContextMenuPrimitive.Trigger {...rest} data-slot="context-menu-trigger" className={clsx(className)}>
      {children}
    </ContextMenuPrimitive.Trigger>
  )
}

function ContextMenuIcon(props: ContextMenuIconProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <ContextMenuPrimitive.ItemIndicator {...rest} data-slot="context-menu-icon" className={clsx(className)}>
      {children}
    </ContextMenuPrimitive.ItemIndicator>
  )
}

function ContextMenuPortal(props: ContextMenuPortalProps) {
  return <ContextMenuPrimitive.Portal {...props} />
}

function ContextMenuContent(props: ContextMenuContentProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <ContextMenuPrimitive.Content {...rest} data-component="context-menu-content" className={clsx(className)}>
      {children}
    </ContextMenuPrimitive.Content>
  )
}

function ContextMenuArrow(props: ContextMenuArrowProps) {
  const { className, ...rest } = props
  return <ContextMenuPrimitive.Arrow {...rest} data-slot="context-menu-arrow" className={clsx(className)} />
}

function ContextMenuSeparator(props: ContextMenuSeparatorProps) {
  const { className, ...rest } = props
  return <ContextMenuPrimitive.Separator {...rest} data-slot="context-menu-separator" className={clsx(className)} />
}

function ContextMenuGroup(props: ContextMenuGroupProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <ContextMenuPrimitive.Group {...rest} data-slot="context-menu-group" className={clsx(className)}>
      {children}
    </ContextMenuPrimitive.Group>
  )
}

function ContextMenuGroupLabel(props: ContextMenuGroupLabelProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <ContextMenuPrimitive.Label {...rest} data-slot="context-menu-group-label" className={clsx(className)}>
      {children}
    </ContextMenuPrimitive.Label>
  )
}

function ContextMenuItem(props: ContextMenuItemProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <ContextMenuPrimitive.Item {...rest} data-slot="context-menu-item" className={clsx(className)}>
      {children}
    </ContextMenuPrimitive.Item>
  )
}

function ContextMenuItemLabel(props: ContextMenuItemLabelProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <span {...rest} data-slot="context-menu-item-label" className={clsx(className)}>
      {children}
    </span>
  )
}

function ContextMenuItemDescription(props: ContextMenuItemDescriptionProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <span {...rest} data-slot="context-menu-item-description" className={clsx(className)}>
      {children}
    </span>
  )
}

function ContextMenuItemIndicator(props: ContextMenuItemIndicatorProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <ContextMenuPrimitive.ItemIndicator {...rest} data-slot="context-menu-item-indicator" className={clsx(className)}>
      {children}
    </ContextMenuPrimitive.ItemIndicator>
  )
}

function ContextMenuRadioGroup(props: ContextMenuRadioGroupProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <ContextMenuPrimitive.RadioGroup {...rest} data-slot="context-menu-radio-group" className={clsx(className)}>
      {children}
    </ContextMenuPrimitive.RadioGroup>
  )
}

function ContextMenuRadioItem(props: ContextMenuRadioItemProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <ContextMenuPrimitive.RadioItem {...rest} data-slot="context-menu-radio-item" className={clsx(className)}>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
}

function ContextMenuCheckboxItem(props: ContextMenuCheckboxItemProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <ContextMenuPrimitive.CheckboxItem {...rest} data-slot="context-menu-checkbox-item" className={clsx(className)}>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

function ContextMenuSub(props: ContextMenuSubProps) {
  return <ContextMenuPrimitive.Sub {...props} />
}

function ContextMenuSubTrigger(props: ContextMenuSubTriggerProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <ContextMenuPrimitive.SubTrigger {...rest} data-slot="context-menu-sub-trigger" className={clsx(className)}>
      {children}
    </ContextMenuPrimitive.SubTrigger>
  )
}

function ContextMenuSubContent(props: ContextMenuSubContentProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <ContextMenuPrimitive.SubContent {...rest} data-component="context-menu-sub-content" className={clsx(className)}>
      {children}
    </ContextMenuPrimitive.SubContent>
  )
}

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Trigger: ContextMenuTrigger,
  Icon: ContextMenuIcon,
  Portal: ContextMenuPortal,
  Content: ContextMenuContent,
  Arrow: ContextMenuArrow,
  Separator: ContextMenuSeparator,
  Group: ContextMenuGroup,
  GroupLabel: ContextMenuGroupLabel,
  Item: ContextMenuItem,
  ItemLabel: ContextMenuItemLabel,
  ItemDescription: ContextMenuItemDescription,
  ItemIndicator: ContextMenuItemIndicator,
  RadioGroup: ContextMenuRadioGroup,
  RadioItem: ContextMenuRadioItem,
  CheckboxItem: ContextMenuCheckboxItem,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
})
