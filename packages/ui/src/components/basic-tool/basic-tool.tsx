import { animate, type AnimationPlaybackControls } from "motion"
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react"
import { Collapsible } from "../collapsible"
import type { IconProps } from "../icon"
import { TextShimmer } from "../text-shimmer"

export type TriggerTitle = {
  title: string
  titleClass?: string
  subtitle?: string
  subtitleClass?: string
  args?: string[]
  argsClass?: string
  action?: ReactNode
}

const isTriggerTitle = (val: unknown): val is TriggerTitle =>
  typeof val === "object" && val !== null && "title" in val && (typeof Node === "undefined" || !(val instanceof Node))

export interface BasicToolProps {
  icon: IconProps["name"]
  trigger: TriggerTitle | ReactNode
  children?: ReactNode
  status?: string
  hideDetails?: boolean
  defaultOpen?: boolean
  forceOpen?: boolean
  defer?: boolean
  locked?: boolean
  animated?: boolean
  onSubtitleClick?: () => void
}

const SPRING = { type: "spring" as const, visualDuration: 0.35, bounce: 0 }

export function BasicTool(props: BasicToolProps) {
  const [open, setOpen] = useState(props.defaultOpen ?? false)
  const [ready, setReady] = useState(open)
  const pending = props.status === "pending" || props.status === "running"
  const frame = useRef<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<AnimationPlaybackControls | null>(null)
  const initialOpen = open

  useEffect(() => {
    if (props.forceOpen) setOpen(true)
  }, [props.forceOpen])

  useEffect(() => {
    if (!props.defer) return
    if (!open) {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
      setReady(false)
      return
    }
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      if (!open) return
      setReady(true)
    })
  }, [open, props.defer])

  useEffect(() => {
    if (!props.animated || !contentRef.current) return
    animRef.current?.stop()
    if (open) {
      contentRef.current.style.overflow = "hidden"
      animRef.current = animate(contentRef.current, { height: "auto" }, SPRING)
      animRef.current.finished.then(() => {
        if (!contentRef.current || !open) return
        contentRef.current.style.overflow = "visible"
        contentRef.current.style.height = "auto"
      })
      return
    }
    contentRef.current.style.overflow = "hidden"
    animRef.current = animate(contentRef.current, { height: "0px" }, SPRING)
  }, [open, props.animated])

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      animRef.current?.stop()
    },
    [],
  )

  const handleOpenChange = (value: boolean) => {
    if (pending) return
    if (props.locked && !value) return
    setOpen(value)
  }

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange} className="tool-collapsible">
      <Collapsible.Trigger>
        <div data-component="tool-trigger">
          <div data-slot="basic-tool-tool-trigger-content">
            <div data-slot="basic-tool-tool-info">
              {isTriggerTitle(props.trigger) ? (
                (() => {
                  const trigger = props.trigger
                  return (
                    <div data-slot="basic-tool-tool-info-structured">
                      <div data-slot="basic-tool-tool-info-main">
                        <span data-slot="basic-tool-tool-title" className={trigger.titleClass ?? ""}>
                          <TextShimmer text={trigger.title} active={pending} />
                        </span>
                        {!pending ? (
                          <>
                            {trigger.subtitle ? (
                              <span
                                data-slot="basic-tool-tool-subtitle"
                                className={`${trigger.subtitleClass ?? ""} ${props.onSubtitleClick ? "clickable" : ""}`.trim()}
                                onClick={(e) => {
                                  if (!props.onSubtitleClick) return
                                  e.stopPropagation()
                                  props.onSubtitleClick()
                                }}
                              >
                                {trigger.subtitle}
                              </span>
                            ) : null}
                            {trigger.args?.length
                              ? trigger.args.map((arg) => (
                                  <span key={arg} data-slot="basic-tool-tool-arg" className={trigger.argsClass ?? ""}>
                                    {arg}
                                  </span>
                                ))
                              : null}
                          </>
                        ) : null}
                      </div>
                      {!pending && trigger.action ? trigger.action : null}
                    </div>
                  )
                })()
              ) : (
                <Fragment>{props.trigger}</Fragment>
              )}
            </div>
          </div>
          {props.children && !props.hideDetails && !props.locked && !pending ? <Collapsible.Arrow /> : null}
        </div>
      </Collapsible.Trigger>

      {props.animated && props.children && !props.hideDetails ? (
        <div
          ref={contentRef}
          data-slot="collapsible-content"
          data-animated
          style={{
            height: initialOpen ? "auto" : "0px",
            overflow: initialOpen ? "visible" : "hidden",
          }}
        >
          {props.children}
        </div>
      ) : null}

      {!props.animated && props.children && !props.hideDetails ? (
        <Collapsible.Content>{!props.defer || ready ? props.children : null}</Collapsible.Content>
      ) : null}
    </Collapsible>
  )
}

function label(input: Record<string, unknown> | undefined) {
  const keys = ["description", "query", "url", "filePath", "path", "pattern", "name"]
  return keys.map((key) => input?.[key]).find((value): value is string => typeof value === "string" && value.length > 0)
}

function args(input: Record<string, unknown> | undefined) {
  if (!input) return []
  const skip = new Set(["description", "query", "url", "filePath", "path", "pattern", "name"])
  return Object.entries(input)
    .filter(([key]) => !skip.has(key))
    .flatMap(([key, value]) => {
      if (typeof value === "string") return [`${key}=${value}`]
      if (typeof value === "number") return [`${key}=${value}`]
      if (typeof value === "boolean") return [`${key}=${value}`]
      return []
    })
    .slice(0, 3)
}

export function GenericTool(props: { tool: string; status?: string; hideDetails?: boolean; input?: Record<string, unknown> }) {
  return (
    <BasicTool
      icon="mcp"
      status={props.status}
      trigger={{
        title: `Called \`${props.tool}\``,
        subtitle: label(props.input),
        args: args(props.input),
      }}
      hideDetails={props.hideDetails}
    />
  )
}
