import { type ComponentProps, useMemo, useState } from "react"
import { type UiI18nKey, useI18n } from "../../context/i18n"
import { Card, CardDescription } from "../card"
import { Collapsible } from "../collapsible"
import { Icon } from "../icon"
import { IconButton } from "../icon-button"
import { Tooltip } from "../tooltip"

export interface ToolErrorCardProps extends Omit<ComponentProps<typeof Card>, "children" | "variant"> {
  tool: string
  error: string
}

export function ToolErrorCard(props: ToolErrorCardProps) {
  const i18n = useI18n()
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const { tool, error, ...rest } = props
  const name = useMemo(() => {
    const map: Record<string, string> = {
      read: "ui.tool.read",
      list: "ui.tool.list",
      glob: "ui.tool.glob",
      grep: "ui.tool.grep",
      webfetch: "ui.tool.webfetch",
      websearch: "ui.tool.websearch",
      codesearch: "ui.tool.codesearch",
      bash: "ui.tool.shell",
      apply_patch: "ui.tool.patch",
      question: "ui.tool.questions",
    }
    const key = map[tool]
    if (!key) return tool
    return i18n.t(key as UiI18nKey)
  }, [i18n, tool])
  const cleaned = useMemo(() => error.replace(/^Error:\s*/, "").trim(), [error])
  const tail = useMemo(() => {
    const prefix = `${tool} `
    if (cleaned.startsWith(prefix)) return cleaned.slice(prefix.length)
    return cleaned
  }, [cleaned, tool])
  const subtitle = useMemo(() => {
    const parts = tail.split(": ")
    if (parts.length <= 1) return "Failed"
    const head = (parts[0] ?? "").trim()
    if (!head) return "Failed"
    return head[0] ? head[0].toUpperCase() + head.slice(1) : "Failed"
  }, [tail])
  const body = useMemo(() => {
    const parts = tail.split(": ")
    if (parts.length <= 1) return cleaned
    return parts.slice(1).join(": ").trim() || cleaned
  }, [cleaned, tail])

  const copy = async () => {
    if (!cleaned) return
    await navigator.clipboard.writeText(cleaned)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card {...rest} data-kind="tool-error-card" data-open={open ? "true" : "false"} variant="error">
      <Collapsible className="tool-collapsible" data-open={open ? "true" : "false"} open={open} onOpenChange={setOpen}>
        <Collapsible.Trigger>
          <div data-component="tool-trigger">
            <div data-slot="basic-tool-tool-trigger-content">
              <span data-slot="basic-tool-tool-indicator" data-component="tool-error-card-icon">
                <Icon name="circle-ban-sign" size="small" style={{ strokeWidth: 1.5 }} />
              </span>
              <div data-slot="basic-tool-tool-info">
                <div data-slot="basic-tool-tool-info-structured">
                  <div data-slot="basic-tool-tool-info-main">
                    <span data-slot="basic-tool-tool-title">{name}</span>
                    <span data-slot="basic-tool-tool-subtitle">{subtitle}</span>
                  </div>
                </div>
              </div>
            </div>
            <Collapsible.Arrow />
          </div>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div data-slot="tool-error-card-content">
            {open ? (
              <div data-slot="tool-error-card-copy">
                <Tooltip value={copied ? i18n.t("ui.message.copied") : "Copy error"}>
                  <IconButton
                    icon={copied ? "check" : "copy"}
                    size="normal"
                    variant="ghost"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation()
                      copy()
                    }}
                    aria-label={copied ? i18n.t("ui.message.copied") : "Copy error"}
                  />
                </Tooltip>
              </div>
            ) : null}
            {body ? <CardDescription>{body}</CardDescription> : null}
          </div>
        </Collapsible.Content>
      </Collapsible>
    </Card>
  )
}
