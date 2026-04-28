import type { Meta, StoryObj } from "@storybook/react"
import { I18nProvider } from "../../context/i18n"
import { dict as en } from "../../i18n/en"
import { TextField } from "./text-field"

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

const meta = {
  title: "Form/TextField",
  id: "components-text-field",
  component: TextField,
  tags: ["autodocs"],
  args: {
    label: "Label",
    placeholder: "Type here...",
    defaultValue: "Hello",
  },
  decorators: [
    (Story) => (
      <I18nProvider value={i18n}>
        <Story />
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof TextField>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: {} }

export const Variants: Story = {
  args: {},
  render: () => (
    <div style={{ display: "grid", gap: 12, width: 320 }}>
      <TextField label="Normal" placeholder="Type here..." defaultValue="Value" />
      <TextField label="Ghost" variant="ghost" placeholder="Type here..." defaultValue="Value" />
    </div>
  ),
}

export const Multiline: Story = {
  args: {
    label: "Description",
    multiline: true,
    defaultValue: "Line one\nLine two",
  },
}

export const Copyable: Story = {
  args: {
    label: "Invite link",
    defaultValue: "https://example.com/invite/abc",
    copyable: true,
    copyKind: "link",
  },
}

export const Error: Story = {
  args: {
    label: "Email",
    defaultValue: "invalid@",
    error: "Enter a valid email address",
  },
}

export const Disabled: Story = {
  args: {
    label: "Disabled",
    defaultValue: "Readonly",
    disabled: true,
  },
}

export const ReadOnly: Story = {
  args: {
    label: "Read only",
    defaultValue: "Read only value",
    readOnly: true,
  },
}

export const HiddenLabel: Story = {
  args: {
    label: "Hidden label",
    hideLabel: true,
    placeholder: "Hidden label",
  },
}
