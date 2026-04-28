import { clsx } from "clsx"
import { type KeyboardEvent as ReactKeyboardEvent } from "react"
import { type ComponentProps, useId, useState } from "react"
import { useI18n } from "../../context/i18n"
import { IconButton } from "../icon-button"
import { Tooltip } from "../tooltip"

export interface TextFieldProps extends Omit<ComponentProps<"input">, "onChange"> {
  name?: string
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  validationState?: "valid" | "invalid"
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  label?: string
  hideLabel?: boolean
  description?: string
  error?: string
  variant?: "normal" | "ghost"
  copyable?: boolean
  copyKind?: "clipboard" | "link"
  multiline?: boolean
}

export function TextField(props: TextFieldProps) {
  const i18n = useI18n()
  const [copied, setCopied] = useState(false)
  const id = useId()
  const {
    name,
    defaultValue,
    value,
    onChange,
    onKeyDown,
    required,
    disabled,
    readOnly,
    className,
    label,
    hideLabel,
    description,
    error,
    variant = "normal",
    copyable,
    copyKind,
    multiline,
    ...rest
  } = props

  const text = () => {
    if (copied) return i18n.t("ui.textField.copied")
    if (copyKind === "link") return i18n.t("ui.textField.copyLink")
    return i18n.t("ui.textField.copyToClipboard")
  }

  const icon = () => {
    if (copied) return "check"
    if (copyKind === "link") return "link"
    return "copy"
  }

  async function handleCopy() {
    const next = value ?? defaultValue ?? ""
    await navigator.clipboard.writeText(next)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      data-component="input"
      data-variant={variant}
      onClick={() => {
        if (copyable) handleCopy()
      }}
    >
      {label ? (
        <label data-slot="input-label" className={clsx(hideLabel && "sr-only")} htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div data-slot="input-wrapper">
        {multiline ? (
          <textarea
            {...(rest as Omit<ComponentProps<"textarea">, "onChange">)}
            id={id}
            name={name}
            defaultValue={defaultValue}
            value={value}
            onChange={(e) => onChange?.(e.currentTarget.value)}
            onKeyDown={(e) => onKeyDown?.(e as unknown as ReactKeyboardEvent<HTMLInputElement>)}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            data-slot="input-input"
            className={clsx(className)}
          />
        ) : (
          <input
            {...rest}
            id={id}
            name={name}
            defaultValue={defaultValue}
            value={value}
            onChange={(e) => onChange?.(e.currentTarget.value)}
            onKeyDown={onKeyDown}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            data-slot="input-input"
            data-invalid={error ? "true" : undefined}
            data-readonly={readOnly ? "true" : undefined}
            className={clsx(className)}
          />
        )}
        {copyable ? (
          <Tooltip value={text()} forceOpen={copied}>
            <IconButton
              type="button"
              icon={icon()}
              variant="ghost"
              onClick={handleCopy}
              tabIndex={-1}
              data-slot="input-copy-button"
              aria-label={text()}
            />
          </Tooltip>
        ) : null}
      </div>
      {description ? <div data-slot="input-description">{description}</div> : null}
      <div data-slot="input-error">{error}</div>
    </div>
  )
}
