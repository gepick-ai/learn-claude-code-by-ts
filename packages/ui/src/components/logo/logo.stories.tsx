import type { Meta, StoryObj } from "@storybook/react"
import * as mod from "./logo"

const docs = `### 概览
Logo 资源组件，包含 Mark、Splash、Logo 三种形态。

### API
- \`Mark\`、\`Splash\`、\`Logo\` 支持标准 SVG 属性。

### 变体与状态
- 提供适用于不同场景的三种图形形态。

### 行为
- 纯 SVG 渲染，无额外交互逻辑。

### 可访问性
- 当 Logo 承载语义时，建议补充 \`aria-label\` 或 \`title\`。

### 主题与令牌
- 通过语义 CSS 变量控制图形颜色。
`

const meta = {
  title: "UI/Brand/Logo",
  id: "components-logo",
  tags: ["autodocs"],
  component: mod.Logo,
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof mod.Logo>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16, alignItems: "start" }}>
      <div>
        <div style={{ color: "var(--text-weak)", fontSize: 12 }}>Mark</div>
        <mod.Mark />
      </div>
      <div>
        <div style={{ color: "var(--text-weak)", fontSize: 12 }}>Splash</div>
        <mod.Splash style={{ width: 80, height: 100 }} />
      </div>
      <div>
        <div style={{ color: "var(--text-weak)", fontSize: 12 }}>Logo</div>
        <mod.Logo style={{ width: 200 }} />
      </div>
    </div>
  ),
}
