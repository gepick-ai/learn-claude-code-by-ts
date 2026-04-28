import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useState } from "react"
import { Accordion } from "./accordion"

const docs = `### 概览
用于折叠展示分组内容，支持单开与多开模式。

### API
- Root 支持 Accordion 常用属性：\`value\`、\`type\`、\`collapsible\`、\`onValueChange\`。
- 通过 \`Accordion.Item/Header/Trigger/Content\` 组合使用。

### 变体与状态
- 单开（single）与多开（multiple）。
- 可折叠与不可折叠。

### 行为
- 可用受控方式通过 \`value\` 和 \`onValueChange\` 管理展开项。

### 可访问性
- 基于 Radix Accordion，支持基础键盘导航与语义属性。

### 主题与令牌
- 使用 \`data-component="accordion"\` 和 slot 属性驱动样式。
`

const meta = {
  title: "Display/Accordion",
  id: "components-accordion",
  component: Accordion,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    collapsible: true,
    type: "single",
    value: "first",
  },
  render: (props) => {
    const cfg = props as {
      collapsible?: boolean
      type?: "single" | "multiple"
      value?: string | string[]
    }
    const [value, setValue] = useState<string | string[] | undefined>(cfg.value)
    useEffect(() => {
      setValue(cfg.value)
    }, [cfg.value])
    return (
      <div style={{ display: "grid", gap: 8, width: 420 }}>
        <Accordion
          collapsible={cfg.collapsible}
          type={cfg.type ?? "single"}
          value={value as never}
          onValueChange={setValue as never}
        >
          <Accordion.Item value="first">
            <Accordion.Header>
              <Accordion.Trigger>First</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <div style={{ color: "var(--text-weak)", padding: "8px 0" }}>Accordion content.</div>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="second">
            <Accordion.Header>
              <Accordion.Trigger>Second</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <div style={{ color: "var(--text-weak)", padding: "8px 0" }}>More content.</div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    )
  },
}

export const Multiple: Story = {
  args: { type: "multiple" },
  render: () => (
    <Accordion type="multiple" defaultValue={["first", "second"]}>
      <Accordion.Item value="first">
        <Accordion.Header>
          <Accordion.Trigger>First</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          <div style={{ color: "var(--text-weak)", padding: "8px 0" }}>Accordion content.</div>
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="second">
        <Accordion.Header>
          <Accordion.Trigger>Second</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          <div style={{ color: "var(--text-weak)", padding: "8px 0" }}>More content.</div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  ),
}

export const NonCollapsible: Story = {
  args: { type: "single" },
  render: () => (
    <Accordion collapsible={false} type="single" value="first">
      <Accordion.Item value="first">
        <Accordion.Header>
          <Accordion.Trigger>First</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          <div style={{ color: "var(--text-weak)", padding: "8px 0" }}>Accordion content.</div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  ),
}
