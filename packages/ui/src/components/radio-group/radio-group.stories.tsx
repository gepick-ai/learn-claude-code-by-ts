import type { Meta, StoryObj } from "@storybook/react"
import { RadioGroup } from "./radio-group"

const docs = `### 概览
用于单选切换的分段选择器。

### API
- 必填：\`options\`。
- 可选：\`current\`、\`defaultValue\`、\`value\`、\`label\`、\`onSelect\`。
- 可选布局：\`size\`、\`fill\`、\`pad\`。

### 变体与状态
- 尺寸：small、medium。
- 可选 fill 与 pad 布局控制。

### 行为
- 将 options 映射为分段项并维护单选状态。

### 可访问性
- 使用 radio 语义进行键盘与读屏支持。

### 主题与令牌
- 使用 \`data-component="radio-group"\` 与 size/pad 属性命中样式。
`

const meta = {
  title: "Form/RadioGroup",
  id: "components-radio-group",
  tags: ["autodocs"],
  component: RadioGroup<string>,
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    options: ["One", "Two", "Three"],
    defaultValue: "One",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["small", "medium"],
    },
    pad: {
      control: "select",
      options: ["none", "normal"],
    },
    fill: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof RadioGroup<string>>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <RadioGroup options={["One", "Two"]} defaultValue="One" size="small" />
      <RadioGroup options={["One", "Two"]} defaultValue="One" size="medium" />
    </div>
  ),
}

export const Filled: Story = {
  args: {
    fill: true,
    pad: "none",
  },
}

export const CustomLabels: Story = {
  render: () => (
    <RadioGroup
      options={["list", "grid"]}
      defaultValue="list"
      label={(value) => (value === "list" ? "List view" : "Grid view")}
    />
  ),
}
