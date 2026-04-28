import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "../button"
import { Card, CardActions, CardDescription, CardTitle } from "./card"

const docs = `### 概览
用于聚合相关内容与操作的轻量容器。

### API
- 可选：\`variant\`（normal、error、warning、success、info）。
- 支持标准 div 属性。

### 变体与状态
- 支持语义状态变体，用于提示/告警/成功等内容。

### 行为
- 纯展示型容器，不包含业务逻辑。

### 可访问性
- 独立使用时建议提供清晰标题或 aria 标签。

### 主题与令牌
- 使用 \`data-component="card"\` 与 slot 属性进行样式命中。
`

type Variant = "normal" | "error" | "warning" | "success" | "info"

const meta = {
  title: "Display/Card",
  id: "components-card",
  tags: ["autodocs"],
  component: Card,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    variant: "normal" as Variant,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["normal", "error", "warning", "success", "info"],
    },
  },
  render: (args) => (
    <Card variant={args.variant as Variant} style={{ width: 320 }}>
      <CardTitle variant={args.variant as Variant}>Card title</CardTitle>
      <CardDescription>Small supporting text.</CardDescription>
      <CardActions>
        <Button size="small" variant="secondary">
          Action
        </Button>
      </CardActions>
    </Card>
  ),
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}
export const Error: Story = { args: { variant: "error" } }
export const Warning: Story = { args: { variant: "warning" } }
export const Success: Story = { args: { variant: "success" } }
export const Info: Story = { args: { variant: "info" } }
