import type { Meta, StoryObj } from "@storybook/react"
import { useRef } from "react"
import { HoverCard } from "./hover-card"

const docs = `### Overview
Hover-triggered card for lightweight previews and metadata.
`

const meta = {
  title: "Overlay/HoverCard",
  id: "components-hover-card",
  component: HoverCard,
  tags: ["autodocs"],
  args: {
    trigger: <span style={{ textDecoration: "underline", cursor: "default" }}>Hover me</span>,
  },
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof HoverCard>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {},
  render: (args) => (
    <HoverCard {...args}>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontWeight: 600 }}>Preview</div>
        <div style={{ color: "var(--text-weak)", fontSize: 12 }}>Short supporting text.</div>
      </div>
    </HoverCard>
  ),
}

export const InlineMount: Story = {
  args: {},
  render: () => {
    const ref = useRef<HTMLDivElement>(null)
    return (
      <div ref={ref} style={{ padding: 16, border: "1px dashed var(--border-weak)" }}>
        <HoverCard mount={ref.current ?? undefined} trigger={<span style={{ textDecoration: "underline", cursor: "default" }}>Hover me</span>}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Mounted inside</div>
            <div style={{ color: "var(--text-weak)", fontSize: 12 }}>Uses custom mount node.</div>
          </div>
        </HoverCard>
      </div>
    )
  },
}
