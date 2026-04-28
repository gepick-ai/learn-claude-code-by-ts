import type { Meta, StoryObj } from "@storybook/react"
import { Switch } from "./switch"

const docs = `### 概览
二值切换控件，适用于设置开关场景。

### API
- 支持 Radix Switch 常用属性（\`checked\`、\`defaultChecked\`、\`onCheckedChange\`）。
- 可选：\`hideLabel\`、\`description\`、\`readonly\`、\`invalid\`。
- children 作为标签文案。

### 变体与状态
- 支持 checked / unchecked / disabled 状态。

### 行为
- 支持受控与非受控模式。

### 可访问性
- 基于 Radix Switch，支持键盘焦点与语义状态。

### 主题与令牌
- 使用 \`data-component="switch"\` 与 slot 命名消费语义变量。
`

const meta = {
  title: "Form/Switch",
  id: "components-switch",
  tags: ["autodocs"],
  component: Switch,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    defaultChecked: true,
    children: "Enable notifications",
  },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const States: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <Switch defaultChecked>Enabled</Switch>
      <Switch>Disabled</Switch>
      <Switch disabled>Disabled switch</Switch>
      <Switch description="Optional description">With description</Switch>
    </div>
  ),
}

export const HiddenLabel: Story = {
  args: {
    children: "Hidden label",
    hideLabel: true,
    defaultChecked: true,
  },
}
