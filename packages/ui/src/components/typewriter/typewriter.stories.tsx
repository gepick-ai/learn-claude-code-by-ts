import type { Meta, StoryObj } from "@storybook/react"
import { Typewriter } from "./typewriter"

const docs = `### 概览
逐字打字机动画，适合短状态文案。

### API
- \`text\`：要展示的文本。
- \`as\`：可选，切换渲染标签。

### 行为
- 随机打字间隔，结束后光标闪烁并自动隐藏。
`

const meta = {
  title: "AI/Typewriter",
  id: "components-typewriter",
  component: Typewriter,
  tags: ["autodocs"],
  args: {
    text: "Typewriter text",
  },
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof Typewriter>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {},
}

export const Inline: Story = {
  args: {
    text: "Inline typewriter",
    as: "span",
  },
}
