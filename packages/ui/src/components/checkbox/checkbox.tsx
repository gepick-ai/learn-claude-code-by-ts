import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { type ReactNode, useId } from "react"

export interface CheckboxProps extends Omit<CheckboxPrimitive.CheckboxProps, "children"> {
  children?: ReactNode
  hideLabel?: boolean
  description?: string
  icon?: ReactNode
  invalid?: boolean
  readonly?: boolean
}

export function Checkbox(props: CheckboxProps) {
  const { children, hideLabel, description, icon, className, disabled, invalid, readonly, onCheckedChange, ...rest } = props
  const id = useId()
  return (
    <div data-component="checkbox" data-disabled={disabled || undefined} data-readonly={readonly || undefined}>
      <CheckboxPrimitive.Root
        {...rest}
        id={id}
        className={className}
        data-slot="checkbox-checkbox-input"
        data-invalid={invalid || undefined}
        disabled={disabled}
        onCheckedChange={readonly ? undefined : onCheckedChange}
      >
        <span data-slot="checkbox-checkbox-control">
          <CheckboxPrimitive.Indicator data-slot="checkbox-checkbox-indicator">
            {icon || (
              <svg viewBox="0 0 12 12" fill="none" width="10" height="10" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 7.17905L5.02703 8.85135L9 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            )}
          </CheckboxPrimitive.Indicator>
        </span>
      </CheckboxPrimitive.Root>
      <div data-slot="checkbox-checkbox-content">
        {children ? (
          <label
            data-slot="checkbox-checkbox-label"
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
        {description ? <div data-slot="checkbox-checkbox-description">{description}</div> : null}
      </div>
    </div>
  )
}
