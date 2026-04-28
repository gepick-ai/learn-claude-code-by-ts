import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "../button"
import * as mod from "./toast"

const docs = `### 概览
Toast 通知，支持图标、动作按钮和异步状态。

### API
- 使用 \`showToast\` 和 \`showPromiseToast\` 触发通知。
- 页面中放置一个 \`Toast.Region\` 作为容器。

### 变体与状态
- 支持 default / success / error / loading。

### 行为
- 默认自动关闭，可通过 \`persistent\` 保持常驻。

### 可访问性
- 基于 Radix Toast，支持键盘与读屏语义。

### 主题与令牌
- 通过 \`data-component="toast"\` 和 slot 命名消费语义变量。
`

const meta: Meta<typeof mod.Toast> = {
  title: "Feedback/Toast",
  id: "components-toast",
  component: mod.Toast,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Basic: Story = {
  args: {},
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <mod.Toast.Region />
      <Button
        variant="primary"
        onClick={() =>
          mod.showToast({
            title: "保存成功",
            description: "你的修改已生效",
            variant: "success",
            icon: "check",
          })
        }
      >
        Show success toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          mod.showToast({
            description: "操作失败，请稍后重试",
            variant: "error",
            icon: "warning",
          })
        }
      >
        Show error toast
      </Button>
    </div>
  ),
}

export const Actions: Story = {
  args: {},
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <mod.Toast.Region />
      <Button
        variant="secondary"
        onClick={() =>
          mod.showToast({
            title: "发现新版本",
            description: "重启后将完成更新",
            actions: [
              { label: "立即重启", onClick: "dismiss" },
              { label: "稍后处理", onClick: "dismiss" },
            ],
          })
        }
      >
        Show action toast
      </Button>
    </div>
  ),
}

export const PromiseStory: Story = {
  args: {},
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <mod.Toast.Region />
      <Button
        variant="secondary"
        onClick={() =>
          mod.showPromiseToast(() => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 800)), {
            loading: "保存中...",
            success: () => "保存成功",
            error: () => "保存失败",
          })
        }
      >
        Show promise toast
      </Button>
    </div>
  ),
}
