import type { Meta, StoryObj } from "@storybook/react"
import { Checkbox } from "./checkbox"

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { "aria-label": "同意条款" },
}

export const WithLabel: Story = {
  render: () => (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-gepick-muted-foreground)]">
      <Checkbox id="terms" defaultChecked />
      <span>已阅读并同意服务条款</span>
    </label>
  ),
}

export const Disabled: Story = {
  args: { disabled: true, "aria-label": "不可选" },
}
