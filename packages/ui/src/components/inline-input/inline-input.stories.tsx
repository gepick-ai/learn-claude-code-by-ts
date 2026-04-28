import type { Meta, StoryObj } from "@storybook/react"
import { InlineInput } from "./inline-input"

const docs = `### 概览
用于短文本编辑的紧凑输入框。

### API
- 可选：\`width\` 用于固定宽度。
- 支持标准 input 属性。

### 变体与状态
- 不提供内置视觉变体，可通过 class 或 width 定制。

### 行为
- 传入 \`width\` 时会以内联样式方式设置宽度。

### 可访问性
- 独立使用时建议补充 label 或 aria-label。

### 主题与令牌
- 使用 \`data-component="inline-input"\` 作为样式钩子。
`

const meta = {
  title: "Form/InlineInput",
  id: "components-inline-input",
  tags: ["autodocs"],
  component: InlineInput,
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    placeholder: "Type...",
    defaultValue: "Inline",
  },
} satisfies Meta<typeof InlineInput>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const FixedWidth: Story = {
  args: {
    defaultValue: "80px",
    width: "80px",
  },
}
