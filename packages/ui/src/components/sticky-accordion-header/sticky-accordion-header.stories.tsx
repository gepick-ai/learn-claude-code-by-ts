import type { Meta, StoryObj } from "@storybook/react"
import { Accordion } from "../accordion"
import { StickyAccordionHeader } from "./sticky-accordion-header"

const docs = `### 概览
用于手风琴内的吸顶标题包装器，保证分组标题在滚动时可见。

仅建议在 \`Accordion.Item\` 内配合 \`Accordion.Trigger\` 使用。

### API
- 接收 Accordion.Header 的标准属性与 children。

### 变体与状态
- 继承 Accordion 的开合状态。

### 行为
- 在 Accordion item header 中渲染，不改变 Trigger 的语义。

### 可访问性
- 语义与可访问性由 Accordion.Header/Trigger 组合保证。

### 主题与令牌
- 使用 \`data-component="sticky-accordion-header"\` 命中样式。
`

const meta = {
  title: "Display/StickyAccordionHeader",
  id: "components-sticky-accordion-header",
  component: StickyAccordionHeader,
  tags: ["autodocs"],
  args: {},
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof StickyAccordionHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {},
  render: () => (
    <Accordion type="single" defaultValue="first" collapsible>
      <Accordion.Item value="first">
        <StickyAccordionHeader>
          <Accordion.Trigger>Sticky header</Accordion.Trigger>
        </StickyAccordionHeader>
        <Accordion.Content>
          <div style={{ color: "var(--text-weak)", padding: "8px 0" }}>Accordion content.</div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  ),
}
