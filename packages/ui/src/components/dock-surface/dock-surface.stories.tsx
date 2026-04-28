import type { Meta, StoryObj } from "@storybook/react"
import { DockShell, DockTray } from "./dock-surface"

const docs = `### 概览
Dock 表面容器，提供 shell/tray 两层结构。

### API
- \`DockShell\`：外层容器（div）。
- \`DockShellForm\`：表单壳层（form）。
- \`DockTray\`：托盘层，支持 \`attach\`。

### 变体与状态
- \`DockTray.attach\`：none | top。

### 行为
- 通过层级样式形成浮层与托盘组合视觉。

### 可访问性
- 语义由承载内容决定，容器本身不附加交互语义。

### 主题与令牌
- 使用 \`data-dock-surface\` 与 \`data-dock-attach\` 命中样式。
`

const meta = {
  title: "UI/Layout/DockSurface",
  id: "components-dock-surface",
  tags: ["autodocs"],
  component: DockShell,
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof DockShell>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <div style={{ width: 360, display: "grid", gap: 8 }}>
      <DockShell style={{ padding: 12 }}>Shell</DockShell>
      <DockTray style={{ padding: 12 }}>Tray</DockTray>
    </div>
  ),
}

export const AttachedTop: Story = {
  render: () => (
    <div style={{ width: 360, display: "grid", gap: 0 }}>
      <DockShell style={{ padding: 12 }}>Shell</DockShell>
      <DockTray attach="top" style={{ padding: 12 }}>
        Attached tray
      </DockTray>
    </div>
  ),
}
