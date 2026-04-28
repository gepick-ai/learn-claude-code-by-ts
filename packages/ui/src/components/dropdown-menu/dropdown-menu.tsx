import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { clsx } from "clsx"
import { type ComponentProps, type ReactNode } from "react"

export interface DropdownMenuProps extends ComponentProps<typeof DropdownMenuPrimitive.Root> {}
export interface DropdownMenuTriggerProps extends ComponentProps<typeof DropdownMenuPrimitive.Trigger> {}
export interface DropdownMenuIconProps extends ComponentProps<typeof DropdownMenuPrimitive.ItemIndicator> {}
export interface DropdownMenuPortalProps extends ComponentProps<typeof DropdownMenuPrimitive.Portal> {}
export interface DropdownMenuContentProps extends ComponentProps<typeof DropdownMenuPrimitive.Content> {}
export interface DropdownMenuArrowProps extends ComponentProps<typeof DropdownMenuPrimitive.Arrow> {}
export interface DropdownMenuSeparatorProps extends ComponentProps<typeof DropdownMenuPrimitive.Separator> {}
export interface DropdownMenuGroupProps extends ComponentProps<typeof DropdownMenuPrimitive.Group> {}
export interface DropdownMenuGroupLabelProps extends ComponentProps<typeof DropdownMenuPrimitive.Label> {}
export interface DropdownMenuItemProps extends ComponentProps<typeof DropdownMenuPrimitive.Item> {}
export interface DropdownMenuItemLabelProps extends ComponentProps<"span"> {}
export interface DropdownMenuItemDescriptionProps extends ComponentProps<"span"> {}
export interface DropdownMenuItemIndicatorProps extends ComponentProps<typeof DropdownMenuPrimitive.ItemIndicator> {}
export interface DropdownMenuRadioGroupProps extends ComponentProps<typeof DropdownMenuPrimitive.RadioGroup> {}
export interface DropdownMenuRadioItemProps extends ComponentProps<typeof DropdownMenuPrimitive.RadioItem> {}
export interface DropdownMenuCheckboxItemProps extends ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> {}
export interface DropdownMenuSubProps extends ComponentProps<typeof DropdownMenuPrimitive.Sub> {}
export interface DropdownMenuSubTriggerProps extends ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> {}
export interface DropdownMenuSubContentProps extends ComponentProps<typeof DropdownMenuPrimitive.SubContent> {}

function DropdownMenuRoot(props: DropdownMenuProps) {
  return <DropdownMenuPrimitive.Root {...props} data-component="dropdown-menu" />
}

function DropdownMenuTrigger(props: DropdownMenuTriggerProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <DropdownMenuPrimitive.Trigger {...rest} data-slot="dropdown-menu-trigger" className={clsx(className)}>
      {children}
    </DropdownMenuPrimitive.Trigger>
  )
}

function DropdownMenuIcon(props: DropdownMenuIconProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <DropdownMenuPrimitive.ItemIndicator {...rest} data-slot="dropdown-menu-icon" className={clsx(className)}>
      {children}
    </DropdownMenuPrimitive.ItemIndicator>
  )
}

function DropdownMenuPortal(props: DropdownMenuPortalProps) {
  return <DropdownMenuPrimitive.Portal {...props} />
}

function DropdownMenuContent(props: DropdownMenuContentProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <DropdownMenuPrimitive.Content {...rest} data-component="dropdown-menu-content" className={clsx(className)}>
      {children}
    </DropdownMenuPrimitive.Content>
  )
}

function DropdownMenuArrow(props: DropdownMenuArrowProps) {
  const { className, ...rest } = props
  return <DropdownMenuPrimitive.Arrow {...rest} data-slot="dropdown-menu-arrow" className={clsx(className)} />
}

function DropdownMenuSeparator(props: DropdownMenuSeparatorProps) {
  const { className, ...rest } = props
  return <DropdownMenuPrimitive.Separator {...rest} data-slot="dropdown-menu-separator" className={clsx(className)} />
}

function DropdownMenuGroup(props: DropdownMenuGroupProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <DropdownMenuPrimitive.Group {...rest} data-slot="dropdown-menu-group" className={clsx(className)}>
      {children}
    </DropdownMenuPrimitive.Group>
  )
}

function DropdownMenuGroupLabel(props: DropdownMenuGroupLabelProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <DropdownMenuPrimitive.Label {...rest} data-slot="dropdown-menu-group-label" className={clsx(className)}>
      {children}
    </DropdownMenuPrimitive.Label>
  )
}

function DropdownMenuItem(props: DropdownMenuItemProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <DropdownMenuPrimitive.Item {...rest} data-slot="dropdown-menu-item" className={clsx(className)}>
      {children}
    </DropdownMenuPrimitive.Item>
  )
}

function DropdownMenuItemLabel(props: DropdownMenuItemLabelProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <span {...rest} data-slot="dropdown-menu-item-label" className={clsx(className)}>
      {children}
    </span>
  )
}

function DropdownMenuItemDescription(props: DropdownMenuItemDescriptionProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <span {...rest} data-slot="dropdown-menu-item-description" className={clsx(className)}>
      {children}
    </span>
  )
}

function DropdownMenuItemIndicator(props: DropdownMenuItemIndicatorProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <DropdownMenuPrimitive.ItemIndicator {...rest} data-slot="dropdown-menu-item-indicator" className={clsx(className)}>
      {children}
    </DropdownMenuPrimitive.ItemIndicator>
  )
}

function DropdownMenuRadioGroup(props: DropdownMenuRadioGroupProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <DropdownMenuPrimitive.RadioGroup {...rest} data-slot="dropdown-menu-radio-group" className={clsx(className)}>
      {children}
    </DropdownMenuPrimitive.RadioGroup>
  )
}

function DropdownMenuRadioItem(props: DropdownMenuRadioItemProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <DropdownMenuPrimitive.RadioItem {...rest} data-slot="dropdown-menu-radio-item" className={clsx(className)}>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuCheckboxItem(props: DropdownMenuCheckboxItemProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <DropdownMenuPrimitive.CheckboxItem {...rest} data-slot="dropdown-menu-checkbox-item" className={clsx(className)}>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuSub(props: DropdownMenuSubProps) {
  return <DropdownMenuPrimitive.Sub {...props} />
}

function DropdownMenuSubTrigger(props: DropdownMenuSubTriggerProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <DropdownMenuPrimitive.SubTrigger {...rest} data-slot="dropdown-menu-sub-trigger" className={clsx(className)}>
      {children}
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent(props: DropdownMenuSubContentProps & { children?: ReactNode }) {
  const { className, children, ...rest } = props
  return (
    <DropdownMenuPrimitive.SubContent {...rest} data-component="dropdown-menu-sub-content" className={clsx(className)}>
      {children}
    </DropdownMenuPrimitive.SubContent>
  )
}

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger: DropdownMenuTrigger,
  Icon: DropdownMenuIcon,
  Portal: DropdownMenuPortal,
  Content: DropdownMenuContent,
  Arrow: DropdownMenuArrow,
  Separator: DropdownMenuSeparator,
  Group: DropdownMenuGroup,
  GroupLabel: DropdownMenuGroupLabel,
  Item: DropdownMenuItem,
  ItemLabel: DropdownMenuItemLabel,
  ItemDescription: DropdownMenuItemDescription,
  ItemIndicator: DropdownMenuItemIndicator,
  RadioGroup: DropdownMenuRadioGroup,
  RadioItem: DropdownMenuRadioItem,
  CheckboxItem: DropdownMenuCheckboxItem,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
})
