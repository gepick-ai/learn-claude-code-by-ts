import type { Meta, StoryObj } from "@storybook/react"
import { Avatar } from "./avatar"

const docs = `### 概览
用户头像组件，支持图片与文本回退显示。

### API
- 必填：\`fallback\`。
- 可选：\`src\`、\`background\`、\`foreground\`、\`size\`。

### 变体与状态
- 尺寸：small、normal、large。
- 状态：图片模式与回退字符模式。

### 行为
- 回退字符按 grapheme 粒度提取首字符。

### 可访问性
- 使用图片时建议由外层补充语义信息（如 aria-label）。

### 主题与令牌
- 使用 \`data-component="avatar"\` 与 size/image 状态属性命中样式。
`

const meta = {
  title: "Display/Avatar",
  id: "components-avatar",
  tags: ["autodocs"],
  component: Avatar,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    fallback: "A",
    size: "normal",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["small", "normal", "large"],
    },
  },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const WithImage: Story = {
  args: {
    src: "https://placehold.co/80x80/png",
    fallback: "J",
  },
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Avatar size="small" fallback="S" />
      <Avatar size="normal" fallback="N" />
      <Avatar size="large" fallback="L" />
    </div>
  ),
}

export const CustomColors: Story = {
  args: {
    fallback: "C",
    background: "#1f2a44",
    foreground: "#f2f5ff",
  },
}
