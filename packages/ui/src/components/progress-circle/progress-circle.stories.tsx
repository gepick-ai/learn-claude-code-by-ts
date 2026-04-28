import type { Meta, StoryObj } from "@storybook/react"
import { ProgressCircle } from "./progress-circle"

const docs = `### 概览
用于紧凑加载态的圆形进度指示器。

### API
- 必填：\`percentage\`（0-100）。
- 可选：\`size\`、\`strokeWidth\`。

### 变体与状态
- 单一视觉样式，可通过 size 与 strokeWidth 调整表现。

### 行为
- percentage 会被限制在 0 到 100 区间内。

### 可访问性
- 建议配合文本或 aria-live 一起传达进度语义。

### 主题与令牌
- 使用 \`data-component="progress-circle"\` 与 background/progress slot 控制样式。
`

const meta = {
  title: "Feedback/ProgressCircle",
  id: "components-progress-circle",
  tags: ["autodocs"],
  component: ProgressCircle,
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    percentage: 65,
    size: 48,
  },
  argTypes: {
    percentage: {
      control: { type: "range", min: 0, max: 100, step: 1 },
    },
  },
} satisfies Meta<typeof ProgressCircle>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const States: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <ProgressCircle percentage={0} size={32} />
      <ProgressCircle percentage={50} size={32} />
      <ProgressCircle percentage={100} size={32} />
    </div>
  ),
}
