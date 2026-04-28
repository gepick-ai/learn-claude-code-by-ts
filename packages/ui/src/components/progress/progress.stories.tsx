import type { Meta, StoryObj } from "@storybook/react"
import { Progress } from "./progress"

const docs = `### 概览
线性进度条，支持标签和值展示。

### API
- 使用 \`value\` 与 \`max\` 控制进度。
- 可选：\`showValueLabel\`、\`hideLabel\`。
- children 作为标签文案。

### 变体与状态
- 支持确定进度与不确定进度（不传 value）。

### 行为
- 进度值由 value/max 计算。

### 可访问性
- 基于 Radix Progress，提供基础语义。

### 主题与令牌
- 使用 \`data-component="progress"\` 与 track/fill slot。
`

const meta = {
  title: "UI/Feedback/Progress",
  id: "components-progress",
  tags: ["autodocs"],
  component: Progress,
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    value: 60,
    max: 100,
    children: "Progress",
    showValueLabel: true,
  },
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
    },
  },
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const NoLabel: Story = {
  args: {
    children: "",
    hideLabel: true,
    showValueLabel: false,
    value: 30,
  },
}

export const Indeterminate: Story = {
  render: () => <Progress>Loading</Progress>,
}
