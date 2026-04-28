import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "./button"

const meta = {
  title: "Components/Button",
  component: Button,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { children: "Primary", variant: "primary" },
}

export const Secondary: Story = {
  args: { children: "Secondary", variant: "secondary" },
}

export const Ghost: Story = {
  args: { children: "Ghost", variant: "ghost" },
}
