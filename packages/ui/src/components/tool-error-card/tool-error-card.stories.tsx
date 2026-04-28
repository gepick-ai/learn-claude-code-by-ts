import type { Meta, StoryObj } from "@storybook/react"
import { I18nProvider } from "../../context/i18n"
import { dict as en } from "../../i18n/en"
import { ToolErrorCard } from "./tool-error-card"

const i18n = {
  locale: () => "en",
  t: (key: keyof typeof en, params?: Record<string, string | number | boolean>) => {
    const text = en[key] ?? String(key)
    if (!params) return text
    return text.replace(/{{\s*([^}]+?)\s*}}/g, (_, rawKey) => {
      const value = params[String(rawKey)]
      return value === undefined ? "" : String(value)
    })
  },
}

const samples = [
  {
    tool: "apply_patch",
    error: "apply_patch verification failed: Failed to find expected lines in /project/ui/session-turn.tsx",
  },
  {
    tool: "bash",
    error: "bash Command failed: exit code 1: bun test --watch",
  },
  {
    tool: "read",
    error: "read File not found: /project/ui/components/does-not-exist.tsx",
  },
]

const meta = {
  title: "AI/ToolErrorCard",
  id: "components-tool-error-card",
  component: ToolErrorCard,
  tags: ["autodocs"],
  args: {
    tool: "apply_patch",
    error: "apply_patch verification failed: Failed to find expected lines in /project/ui/session-turn.tsx",
  },
  argTypes: {
    tool: {
      control: "select",
      options: ["apply_patch", "bash", "read", "glob", "grep", "webfetch", "websearch", "codesearch", "question"],
    },
    error: { control: "text" },
  },
  decorators: [
    (Story) => (
      <I18nProvider value={i18n}>
        <Story />
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof ToolErrorCard>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: {} }

export const All: Story = {
  args: {},
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
      {samples.map((item) => (
        <ToolErrorCard key={item.tool} tool={item.tool} error={item.error} />
      ))}
    </div>
  ),
}
