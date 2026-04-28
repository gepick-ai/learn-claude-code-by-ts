import type { Meta, StoryObj } from "@storybook/react"
import { Font } from "./font"

const meta = {
  title: "Display/Font",
  id: "components-font",
  component: Font,
  tags: ["autodocs"],
} satisfies Meta<typeof Font>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {},
  render: () => (
    <div style={{ display: "grid", gap: 8 }}>
      <Font />
      <div style={{ fontFamily: "var(--font-family-sans)" }}>OpenCode Sans Sample</div>
      <div style={{ fontFamily: "var(--font-family-mono)" }}>OpenCode Mono Sample</div>
    </div>
  ),
}
