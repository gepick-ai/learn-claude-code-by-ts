import * as SwitchPrimitive from "@radix-ui/react-switch"
import { type ReactNode, useId } from "react"

export interface SwitchProps extends Omit<SwitchPrimitive.SwitchProps, "children"> {
  children?: ReactNode
  hideLabel?: boolean
  description?: string
  invalid?: boolean
  readonly?: boolean
}

export function Switch(props: SwitchProps) {
  const { children, hideLabel, description, className, disabled, invalid, readonly, onCheckedChange, ...rest } = props
  const id = useId()
  return (
    <div
      data-component="switch"
      data-disabled={disabled || undefined}
      data-invalid={invalid || undefined}
      data-readonly={readonly || undefined}
    >
      <SwitchPrimitive.Root
        {...rest}
        id={id}
        className={className}
        data-slot="switch-input"
        disabled={disabled}
        onCheckedChange={readonly ? undefined : onCheckedChange}
      >
        <span data-slot="switch-control">
          <SwitchPrimitive.Thumb data-slot="switch-thumb" />
        </span>
      </SwitchPrimitive.Root>
      {children ? (
        <label
          data-slot="switch-label"
          htmlFor={id}
          style={
            hideLabel
              ? {
                  position: "absolute",
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: "hidden",
                  clip: "rect(0, 0, 0, 0)",
                  whiteSpace: "nowrap",
                  borderWidth: 0,
                }
              : undefined
          }
        >
          {children}
        </label>
      ) : null}
      {description ? <div data-slot="switch-description">{description}</div> : null}
      <div data-slot="switch-error" />
    </div>
  )
}
