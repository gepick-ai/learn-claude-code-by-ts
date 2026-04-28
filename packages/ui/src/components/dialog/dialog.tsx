import * as DialogPrimitive from "@radix-ui/react-dialog"
import { clsx } from "clsx"
import { type ComponentProps, type ReactNode } from "react"
import { useI18n } from "../../context/i18n"
import { IconButton } from "../icon-button"

export interface DialogProps {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  size?: "normal" | "large" | "x-large"
  className?: ComponentProps<"div">["className"]
  fit?: boolean
  transition?: boolean
  children?: ReactNode
}

export function Dialog(props: DialogProps) {
  const i18n = useI18n()
  return (
    <div
      data-component="dialog"
      data-fit={props.fit ? true : undefined}
      data-size={props.size || "normal"}
      data-transition={props.transition ? true : undefined}
    >
      <div data-slot="dialog-container">
        <DialogPrimitive.Content
          data-slot="dialog-content"
          data-no-header={!props.title && !props.action ? "" : undefined}
          className={clsx(props.className)}
          onOpenAutoFocus={(e) => {
            const target = e.currentTarget as HTMLElement | null
            const autofocusEl = target?.querySelector("[autofocus]") as HTMLElement | null
            if (!autofocusEl) return
            e.preventDefault()
            autofocusEl.focus()
          }}
        >
          {props.title || props.action ? (
            <div data-slot="dialog-header">
              {props.title ? <DialogPrimitive.Title data-slot="dialog-title">{props.title}</DialogPrimitive.Title> : null}
              {props.action ? (
                props.action
              ) : (
                <DialogPrimitive.Close asChild>
                  <IconButton data-slot="dialog-close-button" icon="close" variant="ghost" aria-label={i18n.t("ui.common.close")} />
                </DialogPrimitive.Close>
              )}
            </div>
          ) : null}
          {props.description ? (
            <DialogPrimitive.Description data-slot="dialog-description" style={{ marginLeft: "-4px" }}>
              {props.description}
            </DialogPrimitive.Description>
          ) : null}
          <div data-slot="dialog-body">{props.children}</div>
        </DialogPrimitive.Content>
      </div>
    </div>
  )
}
