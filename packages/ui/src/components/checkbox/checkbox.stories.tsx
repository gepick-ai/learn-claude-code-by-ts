import type { Meta, StoryObj } from "@storybook/react"
import { Icon } from "../icon"
import { Checkbox } from "./checkbox"

const docs = `### 概览
用于多选、开关确认、条款同意等场景。

### API
- 支持 Radix Checkbox 常用属性（如 \`checked\`、\`defaultChecked\`、\`onCheckedChange\`）。
- 可选：\`hideLabel\`、\`description\`、\`icon\`、\`readonly\`、\`invalid\`。
- children 作为标签内容展示。

### 变体与状态
- 支持 checked / unchecked / indeterminate / disabled。

### 行为
- 支持受控与非受控模式。

### 可访问性
- 基于 Radix Checkbox，支持键盘焦点与状态语义。

### 主题与令牌
- 通过 \`data-component="checkbox"\` 与 slot 选择器消费语义变量。
`

const meta = {
  title: "Form/Checkbox",
  id: "components-checkbox",
  tags: ["autodocs"],
  component: Checkbox,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    children: "Checkbox",
    defaultChecked: true,
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const States: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <Checkbox defaultChecked>Checked</Checkbox>
      <Checkbox>Unchecked</Checkbox>
      <Checkbox disabled>Disabled</Checkbox>
      <Checkbox description="Helper text">With description</Checkbox>
    </div>
  ),
}

export const CustomIcon: Story = {
  render: () => (
    <Checkbox icon={<Icon name="check-small" size="small" />} defaultChecked>
      Custom icon
    </Checkbox>
  ),
}

export const HiddenLabel: Story = {
  args: {
    children: "Hidden label",
    hideLabel: true,
  },
}
