import * as TabsPrimitive from "@radix-ui/react-tabs"
import { clsx } from "clsx"
import { type MouseEvent, type ReactNode } from "react"
import { Icon } from "../icon"

export interface TabsProps extends TabsPrimitive.TabsProps {
  variant?: "normal" | "alt" | "pill" | "settings"
  orientation?: "horizontal" | "vertical"
  className?: string
}

export interface TabsListProps extends TabsPrimitive.TabsListProps {
  className?: string
}

export interface TabsTriggerProps extends TabsPrimitive.TabsTriggerProps {
  classes?: {
    button?: string
  }
  hideCloseButton?: boolean
  closeButton?: ReactNode
  onMiddleClick?: () => void
  className?: string
}

export interface TabsContentProps extends TabsPrimitive.TabsContentProps {
  className?: string
}

function TabsRoot(props: TabsProps) {
  const { className, variant = "normal", orientation = "horizontal", ...rest } = props
  return (
    <TabsPrimitive.Root
      {...rest}
      orientation={orientation}
      data-component="tabs"
      data-variant={variant}
      data-orientation={orientation}
      className={clsx(className)}
    />
  )
}

function TabsList(props: TabsListProps) {
  const { className, ...rest } = props
  return <TabsPrimitive.List {...rest} data-slot="tabs-list" className={clsx(className)} />
}

function TabsTrigger(props: TabsTriggerProps) {
  const { className, classes, children, closeButton, hideCloseButton, onMiddleClick, ...rest } = props
  return (
    <div
      data-slot="tabs-trigger-wrapper"
      data-value={props.value}
      className={clsx(className)}
      onMouseDown={(e: MouseEvent<HTMLDivElement>) => {
        if (e.button === 1 && onMiddleClick) e.preventDefault()
      }}
      onAuxClick={(e: MouseEvent<HTMLDivElement>) => {
        if (e.button !== 1 || !onMiddleClick) return
        e.preventDefault()
        onMiddleClick()
      }}
    >
      <TabsPrimitive.Trigger
        {...rest}
        data-slot="tabs-trigger"
        data-value={props.value}
        className={clsx(classes?.button)}
      >
        {children}
      </TabsPrimitive.Trigger>
      {closeButton ? (
        <div data-slot="tabs-trigger-close-button" data-hidden={hideCloseButton || undefined}>
          {closeButton}
        </div>
      ) : null}
    </div>
  )
}

function TabsContent(props: TabsContentProps) {
  const { className, children, ...rest } = props
  return (
    <TabsPrimitive.Content {...rest} data-slot="tabs-content" className={clsx(className)}>
      {children}
    </TabsPrimitive.Content>
  )
}

function TabsSectionTitle(props: { children?: ReactNode }) {
  return <div data-slot="tabs-section-title">{props.children}</div>
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
  SectionTitle: TabsSectionTitle,
})

export function TabsArrow() {
  return (
    <span data-slot="tabs-arrow-icon">
      <Icon name="chevron-down" size="small" />
    </span>
  )
}
