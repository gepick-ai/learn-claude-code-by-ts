import type { Meta, StoryObj } from "@storybook/react"
import { ICON_NAMES } from "../icon"
import { Button } from "./button"

const docs = `### 概览
主操作按钮，支持尺寸和变体。

适用于表单提交、弹窗确认、工具栏关键操作等场景。

### API
- 可选：\`variant\`（"primary" | "secondary" | "ghost"），默认是 \`secondary\`。
- 可选：\`size\`（"small" | "normal" | "large"），默认是 \`normal\`。
- 可选：\`icon\`，传入图标名称，按钮内部自动渲染 Icon。
- 支持标准 button 原生属性。

### 变体与状态
- 变体：primary、secondary、ghost。
- 状态：hover、active、disabled。
- 尺寸：small、normal、large。

### 行为
- 组件会输出 \`data-component\`、\`data-variant\`、\`data-size\` 供样式命中。

### 可访问性
- 基于原生 \`button\`，天然支持键盘操作和禁用语义。

### 主题与令牌
- 通过 \`components\` layer 中的组件样式消费语义 CSS 变量。

`

const meta = {
  title: "Form/Button",
  id: "components-button",
  tags: ["autodocs"],
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    children: "Button",
    variant: "secondary",
    size: "normal",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost"],
    },
    size: {
      control: "select",
      options: ["small", "normal", "large"],
    },
    icon: {
      control: "select",
      options: [undefined, ...ICON_NAMES],
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { children: "Primary", variant: "primary" },
}

export const Secondary: Story = {
  args: { children: "Secondary", variant: "secondary" },
}

export const Ghost: Story = {
  args: { children: "Ghost", variant: "ghost" },
}

export const Disabled: Story = {
  args: { children: "Disabled", variant: "primary", disabled: true },
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Button size="small">Small</Button>
      <Button size="normal">Normal</Button>
      <Button size="large">Large</Button>
    </div>
  ),
}

export const WithIcon: Story = {
  args: { children: "With Icon", icon: "plus-small" },
}
