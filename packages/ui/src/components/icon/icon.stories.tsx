import type { Meta, StoryObj } from "@storybook/react"
import { Icon, ICON_NAMES } from "./icon"

const docs = `### 概览
内联图标组件，使用内置图标集合渲染 SVG。

可用于按钮、菜单项、提示信息等场景。

### API
- 必填：\`name\`（图标名称）。
- 可选：\`size\`（small | normal | medium | large）。
- 支持标准 SVG 属性（如 \`className\`、\`style\`、\`aria-hidden\`）。

### 变体与状态
- 仅提供尺寸变体。

### 行为
- 使用内置 SVG path 映射渲染图标。

### 可访问性
- 默认 \`aria-hidden\`；如需可访问文本，请在外层补充可读文案。

### 主题与令牌
- 使用 \`data-component="icon"\` 与 \`data-size\` 命中组件样式。
`

const meta = {
  title: "Display/Icon",
  id: "components-icon",
  tags: ["autodocs"],
  component: Icon,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    name: "check",
    size: "normal",
  },
  argTypes: {
    name: {
      control: "select",
      options: ICON_NAMES,
    },
    size: {
      control: "select",
      options: ["small", "normal", "medium", "large"],
    },
  },
} satisfies Meta<typeof Icon>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Icon name="check" size="small" />
      <Icon name="check" size="normal" />
      <Icon name="check" size="medium" />
      <Icon name="check" size="large" />
    </div>
  ),
}

export const Gallery: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
      }}
    >
      {ICON_NAMES.map((name) => (
        <div
          key={name}
          style={{ display: "grid", gap: 6, justifyItems: "center", alignItems: "center" }}
        >
          <Icon name={name} />
          <div style={{ fontSize: 10, color: "var(--text-weak)", textAlign: "center" }}>{name}</div>
        </div>
      ))}
    </div>
  ),
}
