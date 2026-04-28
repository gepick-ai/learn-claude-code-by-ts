import type { Meta, StoryObj } from "@storybook/react"
import { Spinner } from "./spinner"

const docs = `### 概览
用于内联或页面级加载态的动画指示器。

### API
- 支持标准 SVG 属性（className、style）。

### 变体与状态
- 仅默认动画样式。

### 行为
- 动画由 CSS 与数据属性驱动。

### 可访问性
- 建议配合文本或 aria-live 一起表达加载状态。

### 主题与令牌
- 使用 \`data-component="spinner"\` 作为样式钩子。
`

const meta = {
  title: "UI/Feedback/Spinner",
  id: "components-spinner",
  tags: ["autodocs"],
  component: Spinner,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Spinner style={{ width: 12, height: 12 }} />
      <Spinner style={{ width: 20, height: 20 }} />
      <Spinner style={{ width: 28, height: 28 }} />
    </div>
  ),
}
