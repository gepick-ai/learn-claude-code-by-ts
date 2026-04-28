import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "../button"
import { Tooltip, TooltipKeybind } from "./tooltip"

const docs = `### 概览
悬浮提示组件，用于在不打断主界面的情况下补充上下文信息。

### API
- 必填：\`value\`（提示内容）。
- 可选：\`inactive\`（禁用提示）。
- 可选：\`forceOpen\`（强制展示）。
- 可选：\`contentClassName\`、\`contentStyle\`。

### 变体与状态
- 默认悬浮触发。
- 支持 inactive 与 forceOpen 状态。

### 行为
- 通过 Trigger 包裹子元素，在 hover/focus 时显示提示。

### 可访问性
- 基于 Radix Tooltip，支持键盘焦点触发与语义提示。

### 主题与令牌
- 使用 \`data-component="tooltip"\` 与语义变量驱动样式。
`

const meta = {
  title: "UI/Overlay/Tooltip",
  id: "components-tooltip",
  tags: ["autodocs"],
  component: Tooltip,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    value: "这是一个提示",
    children: <Button>悬浮查看提示</Button>,
  },
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const Inactive: Story = {
  args: {
    inactive: true,
  },
}

export const ForceOpen: Story = {
  args: {
    forceOpen: true,
  },
}

export const WithKeybind: Story = {
  render: () => (
    <TooltipKeybind title="发送消息" keybind="Enter">
      <Button>发送</Button>
    </TooltipKeybind>
  ),
}
