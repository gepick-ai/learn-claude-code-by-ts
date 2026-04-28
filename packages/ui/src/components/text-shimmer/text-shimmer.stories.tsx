import type { Meta, StoryObj } from "@storybook/react"
import { TextShimmer } from "./text-shimmer"

const docs = `### 概览
为文本提供 shimmer 扫光动画，适合加载态占位文字。

### API
- 必填：\`text\`。
- 可选：\`as\`、\`active\`、\`offset\`、\`className\`。

### 变体与状态
- 通过 \`active\` 控制启停。

### 行为
- 使用渐变扫光并裁剪到文字上。
- \`offset\` 可让多个 shimmer 错峰运行。

### 可访问性
- 使用 \`aria-label\` 暴露完整文本。

### 主题与令牌
- 使用 \`data-component="text-shimmer"\` 和 CSS 变量控制时序。
`

const meta = {
  title: "AI/TextShimmer",
  id: "components-text-shimmer",
  component: TextShimmer,
  tags: ["autodocs"],
  args: {
    text: "Loading...",
    active: true,
    className: "text-14-medium text-text-strong",
    offset: 0,
  },
  argTypes: {
    text: { control: "text" },
    className: { control: "text" },
    active: { control: "boolean" },
    offset: { control: { type: "range", min: 0, max: 80, step: 1 } },
  },
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof TextShimmer>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {},
}

export const Inactive: Story = {
  args: {
    text: "Static text",
    active: false,
  },
}
