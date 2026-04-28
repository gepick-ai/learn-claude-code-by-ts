import type { Meta, StoryObj } from "@storybook/react"
import { I18nProvider } from "../../context/i18n"
import { MarkedProvider } from "../../context/marked"
import { dict as en } from "../../i18n/en"
import { Markdown } from "./markdown"

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

const sample = `# Markdown

This is a [link](https://example.com) and inline code: \`https://example.com/path\`.

\`\`\`ts
const hello = "world"
console.log(hello)
\`\`\`

- item one
- item two
`

const meta = {
  title: "Display/Markdown",
  id: "components-markdown",
  component: Markdown,
  tags: ["autodocs"],
  args: { text: sample },
  decorators: [
    (Story) => (
      <I18nProvider value={i18n}>
        <MarkedProvider>
          <Story />
        </MarkedProvider>
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof Markdown>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: {} }
