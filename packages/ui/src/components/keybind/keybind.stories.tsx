import type { Meta, StoryObj } from "@storybook/react"
import { Keybind } from "./keybind"

const docs = `### 概览
用于展示键盘快捷键的胶囊样式组件。

### API
- children 作为快捷键文本内容。
- 支持标准 span 属性。

### 变体与状态
- 单一视觉样式。

### 行为
- 纯展示组件，不包含交互逻辑。

### 可访问性
- 建议直接使用可理解文本（例如 Cmd+K）。

### 主题与令牌
- 使用 \`data-component="keybind"\` 作为样式钩子。
`

const meta = {
  title: "Display/Keybind",
  id: "components-keybind",
  tags: ["autodocs"],
  component: Keybind,
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    children: "Cmd+K",
  },
} satisfies Meta<typeof Keybind>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}
