import { type ReactNode, type Ref } from "react"
import { DockShell, DockTray } from "../dock-surface"

export interface DockPromptProps {
  kind: "question" | "permission"
  header: ReactNode
  children: ReactNode
  footer: ReactNode
  ref?: Ref<HTMLDivElement>
}

export function DockPrompt(props: DockPromptProps) {
  const slot = (name: string) => `${props.kind}-${name}`
  return (
    <div data-component="dock-prompt" data-kind={props.kind} ref={props.ref}>
      <DockShell data-slot={slot("body")}>
        <div data-slot={slot("header")}>{props.header}</div>
        <div data-slot={slot("content")}>{props.children}</div>
      </DockShell>
      <DockTray data-slot={slot("footer")}>{props.footer}</DockTray>
    </div>
  )
}
