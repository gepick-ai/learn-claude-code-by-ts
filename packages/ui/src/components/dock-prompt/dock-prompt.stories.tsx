import type { Meta, StoryObj } from "@storybook/react"
import { DockPrompt } from "./dock-prompt"

const docs = `### 概览
Dock 场景下的提示布局组件，支持问题与权限两种结构。

### API
- 必填：\`kind\`、\`header\`、\`children\`、\`footer\`。
- 可选：\`ref\`，用于测量或焦点管理。

### 变体与状态
- \`kind\`：question | permission。

### 行为
- 纯布局组件，交互行为由上层容器实现。

### 可访问性
- 请在 header/footer 中提供清晰上下文与可执行动作。

### 主题与令牌
- 使用 \`data-component="dock-prompt"\` 与 \`data-kind\` 进行样式命中。
`

const meta = {
  title: "Layout/DockPrompt",
  id: "components-dock-prompt",
  tags: ["autodocs"],
  component: DockPrompt,
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    kind: "question",
    header: "Header",
    children: "Prompt content",
    footer: "Footer",
  },
} satisfies Meta<typeof DockPrompt>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const Permission: Story = {
  args: {
    kind: "permission",
    header: "Allow access?",
    children: "This action needs permission to proceed.",
    footer: "Approve or deny",
  },
}
