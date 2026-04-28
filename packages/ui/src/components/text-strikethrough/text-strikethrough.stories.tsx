import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { TextStrikethrough } from "./text-strikethrough"

const docs = `### 概览
弹簧动画删除线组件，从左到右绘制 line-through。

### API
- \`active\`：是否激活删除线。
- \`text\`：展示文本。
- \`visualDuration\`：弹簧视觉时长。

### 行为
- 文本宽度变化时自动重测，删除线绘制长度随文本实际像素宽度变化。
`

const short = "Remove inline measure nodes"
const medium = "Remove inline measure nodes and keep width morph behavior intact"
const long = "Refactor ToolStatusTitle DOM measurement to offscreen global measurer (unconstrained by timeline layout)"

const btn = (active?: boolean) =>
  ({
    padding: "8px 18px",
    borderRadius: "6px",
    border: "1px solid var(--border-weak-base)",
    background: active ? "var(--interactive-base)" : "var(--surface-base)",
    color: "var(--text-strong)",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
  }) as const

const heading = {
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "var(--text-weak)",
  marginBottom: "4px",
}

const card = {
  padding: "16px 20px",
  borderRadius: "10px",
  border: "1px solid var(--border-weak-base)",
  background: "var(--surface-base)",
}

const item = (active: boolean) => ({
  color: active ? "var(--text-weak)" : "var(--text-strong)",
  transition: "color 220ms ease",
})

const meta = {
  title: "UI/AI/TextStrikethrough",
  id: "components-text-strikethrough",
  component: TextStrikethrough,
  tags: ["autodocs"],
  args: {
    active: false,
    text: "Remove inline measure nodes",
  },
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof TextStrikethrough>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: {},
  render: () => {
    const [active, setActive] = useState(true)
    return (
      <div style={{ display: "grid", gap: 24, padding: 24, maxWidth: 780 }}>
        <button type="button" style={btn(active)} onClick={() => setActive((v) => !v)}>
          {active ? "Undo strikethrough" : "Strike through all"}
        </button>
        <div style={card}>
          <div style={heading}>F - grid stacking + clip mapped to text width (the component)</div>
          <TextStrikethrough active={active} text={short} style={item(active)} />
          <div style={{ marginTop: 12 }} />
          <TextStrikethrough active={active} text={medium} style={item(active)} />
          <div style={{ marginTop: 12 }} />
          <TextStrikethrough active={active} text={long} style={item(active)} />
        </div>
      </div>
    )
  },
}
