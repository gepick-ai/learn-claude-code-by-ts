import type { Meta, StoryObj } from "@storybook/react"
import { Collapsible } from "./collapsible"

const docs = `### 概览
可折叠内容容器，支持箭头指示与普通/幽灵样式。

### API
- Root 支持 Radix Collapsible 常用属性（\`open\`、\`defaultOpen\`、\`onOpenChange\`）。
- \`variant\`：normal | ghost。

### 变体与状态
- 变体：normal、ghost。
- 状态：open、closed。

### 行为
- Trigger 负责切换 Content 展开收起。

### 可访问性
- 基于 Radix Collapsible，提供基础键盘与语义支持。

### 主题与令牌
- 使用 \`data-component="collapsible"\` 和 trigger/content/arrow slot 命中样式。
`

const meta = {
  title: "Display/Collapsible",
  id: "components-collapsible",
  tags: ["autodocs"],
  component: Collapsible,
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["normal", "ghost"],
    },
  },
} satisfies Meta<typeof Collapsible>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    variant: "normal",
    defaultOpen: true,
  },
  render: (props) => (
    <Collapsible {...props}>
      <Collapsible.Trigger data-slot="collapsible-trigger">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Details</span>
          <Collapsible.Arrow />
        </div>
      </Collapsible.Trigger>
      <Collapsible.Content data-slot="collapsible-content">
        <div style={{ color: "var(--text-weak)", paddingTop: 8 }}>Optional details sit here.</div>
      </Collapsible.Content>
    </Collapsible>
  ),
}

export const Ghost: Story = {
  args: {
    variant: "ghost",
    defaultOpen: false,
  },
  render: (props) => (
    <Collapsible {...props}>
      <Collapsible.Trigger data-slot="collapsible-trigger">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Ghost trigger</span>
          <Collapsible.Arrow />
        </div>
      </Collapsible.Trigger>
      <Collapsible.Content data-slot="collapsible-content">
        <div style={{ color: "var(--text-weak)", paddingTop: 8 }}>Ghost content.</div>
      </Collapsible.Content>
    </Collapsible>
  ),
}
