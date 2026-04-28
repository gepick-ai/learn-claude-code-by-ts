import type { Meta, StoryObj } from "@storybook/react"
import { Tag } from "./tag"

const docs = `### 概览
轻量标签组件，用于展示状态和元信息。

### API
- 可选：\`size\`（normal | large）。
- 支持标准 \`span\` 属性。

### 变体与状态
- 仅提供尺寸变体。

### 行为
- 内联展示，尺寸控制内边距和字体大小。

### 可访问性
- 文案需可独立表达语义，不依赖颜色。

### 主题与令牌
- 使用 \`data-component="tag"\` 与 \`data-size\` 命中样式。
`

const meta = {
  title: "UI/Display/Tag",
  id: "components-tag",
  tags: ["autodocs"],
  component: Tag,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    children: "Tag",
    size: "normal",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["normal", "large"],
    },
  },
} satisfies Meta<typeof Tag>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Tag size="normal">Normal</Tag>
      <Tag size="large">Large</Tag>
    </div>
  ),
}
