import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { IconButton } from "../icon-button"
import { Tabs } from "./tabs"

const docs = `### 概览
用于同级内容分组切换的 Tabs 容器。

### API
- Root 支持 Tabs 基础属性（\`value\`、\`defaultValue\`、\`onValueChange\`）。
- \`variant\`：normal、alt、pill、settings。
- \`orientation\`：horizontal、vertical。
- Trigger 支持 \`closeButton\`、\`hideCloseButton\`、\`onMiddleClick\`。

### 变体与状态
- 变体：normal / alt / pill / settings。
- 方向：horizontal / vertical。

### 行为
- 基于 Radix Tabs 管理焦点与选中状态。

### 可访问性
- 基于 Radix Tabs，具备基础键盘导航能力。

### 主题与令牌
- 使用 \`data-component="tabs"\` + variant/orientation 数据属性驱动样式。
`

const meta = {
  title: "Navigation/Tabs",
  id: "components-tabs",
  tags: ["autodocs"],
  component: Tabs,
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
      options: ["normal", "alt", "pill", "settings"],
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
  },
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    variant: "normal",
    orientation: "horizontal",
    defaultValue: "overview",
  },
  render: (props) => (
    <Tabs {...props}>
      <Tabs.List>
        <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
        <Tabs.Trigger value="details">Details</Tabs.Trigger>
        <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="overview">Overview content</Tabs.Content>
      <Tabs.Content value="details">Details content</Tabs.Content>
      <Tabs.Content value="activity">Activity content</Tabs.Content>
    </Tabs>
  ),
}

export const Alt: Story = {
  args: { variant: "alt", orientation: "horizontal", defaultValue: "first" },
  render: (props) => (
    <Tabs {...props}>
      <Tabs.List>
        <Tabs.Trigger value="first">First</Tabs.Trigger>
        <Tabs.Trigger value="second">Second</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="first">Alt content</Tabs.Content>
      <Tabs.Content value="second">Alt content 2</Tabs.Content>
    </Tabs>
  ),
}

export const Vertical: Story = {
  args: { variant: "pill", orientation: "vertical", defaultValue: "alpha" },
  render: (props) => (
    <Tabs {...props}>
      <Tabs.List>
        <Tabs.Trigger value="alpha">Alpha</Tabs.Trigger>
        <Tabs.Trigger value="beta">Beta</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="alpha">Alpha content</Tabs.Content>
      <Tabs.Content value="beta">Beta content</Tabs.Content>
    </Tabs>
  ),
}

export const MiddleClick: Story = {
  args: { variant: "normal", orientation: "horizontal", defaultValue: "tab-1" },
  render: (props) => {
    const [msg, setMsg] = useState("Middle click a tab")
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--text-weak)" }}>{msg}</div>
        <Tabs {...props}>
          <Tabs.List>
            <Tabs.Trigger value="tab-1" onMiddleClick={() => setMsg("Middle clicked tab-1")}>
              Tab 1
            </Tabs.Trigger>
            <Tabs.Trigger
              value="tab-2"
              closeButton={<IconButton icon="close" size="small" variant="ghost" aria-label="Close tab" />}
              onMiddleClick={() => setMsg("Middle clicked tab-2")}
            >
              Tab 2
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tab-1">Tab 1 content</Tabs.Content>
          <Tabs.Content value="tab-2">Tab 2 content</Tabs.Content>
        </Tabs>
      </div>
    )
  },
}
