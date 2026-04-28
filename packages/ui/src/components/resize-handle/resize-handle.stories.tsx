import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { ResizeHandle } from "./resize-handle"

const docs = `### 概览
用于分栏/面板拖拽调整尺寸的拖拽手柄。

### API
- 必填：\`direction\`、\`size\`、\`min\`、\`max\`、\`onResize\`。
- 可选：\`edge\`、\`onCollapse\`、\`collapseThreshold\`。

### 变体与状态
- 方向：horizontal、vertical。
- 边缘：start、end。

### 行为
- 拖拽时持续回调 \`onResize\`（已做 min/max clamp）。
- 可选低于阈值触发 \`onCollapse\`。

### 可访问性
- 当前为鼠标拖拽形态，如需键盘支持可在上层补充交互。

### 主题与令牌
- 使用 \`data-component="resize-handle"\` 与 direction/edge 数据属性命中样式。
`

const meta = {
  title: "UI/Layout/ResizeHandle",
  id: "components-resize-handle",
  component: ResizeHandle,
  tags: ["autodocs"],
  args: {
    direction: "horizontal",
    size: 240,
    min: 120,
    max: 480,
    onResize: () => {},
  },
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof ResizeHandle>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {},
  render: () => {
    const [size, setSize] = useState(240)
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ color: "var(--text-weak)", fontSize: 12 }}>Size: {size}px</div>
        <div style={{ width: `${size}px`, height: 48, backgroundColor: "var(--background-stronger)", borderRadius: 6 }} />
        <ResizeHandle
          direction="horizontal"
          size={size}
          min={120}
          max={480}
          onResize={setSize}
          style={{ height: 24, border: "1px dashed color-mix(in oklab, var(--text-base) 20%, transparent)" }}
        />
      </div>
    )
  },
}

export const Vertical: Story = {
  args: {},
  render: () => {
    const [size, setSize] = useState(180)
    return (
      <div style={{ display: "grid", gap: 8, width: 220 }}>
        <div style={{ color: "var(--text-weak)", fontSize: 12 }}>Size: {size}px</div>
        <div style={{ height: `${size}px`, backgroundColor: "var(--background-stronger)", borderRadius: 6 }} />
        <ResizeHandle
          direction="vertical"
          size={size}
          min={120}
          max={320}
          onResize={setSize}
          style={{ width: 24, border: "1px dashed color-mix(in oklab, var(--text-base) 20%, transparent)" }}
        />
      </div>
    )
  },
}

export const Collapse: Story = {
  args: {},
  render: () => {
    const [size, setSize] = useState(200)
    const [collapsed, setCollapsed] = useState(false)
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ color: "var(--text-weak)", fontSize: 12 }}>{collapsed ? "Collapsed" : `Size: ${size}px`}</div>
        <div
          style={{ width: `${collapsed ? 0 : size}px`, height: 48, backgroundColor: "var(--background-stronger)", borderRadius: 6 }}
        />
        <ResizeHandle
          direction="horizontal"
          size={size}
          min={80}
          max={360}
          collapseThreshold={100}
          onResize={(next) => {
            setCollapsed(false)
            setSize(next)
          }}
          onCollapse={() => setCollapsed(true)}
          style={{ height: 24, border: "1px dashed color-mix(in oklab, var(--text-base) 20%, transparent)" }}
        />
      </div>
    )
  },
}

export const EdgeStart: Story = {
  args: {},
  render: () => {
    const [size, setSize] = useState(240)
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ color: "var(--text-weak)", fontSize: 12 }}>Size: {size}px</div>
        <div style={{ width: `${size}px`, height: 48, backgroundColor: "var(--background-stronger)", borderRadius: 6 }} />
        <ResizeHandle
          direction="horizontal"
          edge="start"
          size={size}
          min={120}
          max={480}
          onResize={setSize}
          style={{ height: 24, border: "1px dashed color-mix(in oklab, var(--text-base) 20%, transparent)" }}
        />
      </div>
    )
  },
}
