import type { Meta, StoryObj } from "@storybook/react"
import { IconButton } from "./icon-button"

const docs = `### 概览
仅图标按钮，适合工具栏或紧凑操作位。

### API
- 必填：\`icon\`。
- 可选：\`size\`、\`iconSize\`、\`variant\`。
- 支持标准 button 属性。

### 变体与状态
- 变体：primary、secondary、ghost。
- 尺寸：small、normal、large。

### 行为
- 未传 \`iconSize\` 时会根据 \`size\` 自动选图标尺寸。

### 可访问性
- 由于无可见文本，需传 \`aria-label\`。

### 主题与令牌
- 使用 \`data-component="icon-button"\` 与 size/variant 数据属性命中样式。
`

const meta = {
  title: "UI/Form/IconButton",
  id: "components-icon-button",
  tags: ["autodocs"],
  component: IconButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    icon: "check",
    "aria-label": "Icon button",
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <IconButton icon="check" size="small" aria-label="Small" />
      <IconButton icon="check" size="normal" aria-label="Normal" />
      <IconButton icon="check" size="large" aria-label="Large" />
    </div>
  ),
}

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <IconButton icon="check" variant="primary" aria-label="Primary" />
      <IconButton icon="check" variant="secondary" aria-label="Secondary" />
      <IconButton icon="check" variant="ghost" aria-label="Ghost" />
    </div>
  ),
}
