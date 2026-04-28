import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useState } from "react"
import { AnimatedCountLabel } from "./tool-count-label"

const meta = {
  title: "UI/AI/ToolCountLabel",
  id: "components-tool-count-label",
  component: AnimatedCountLabel,
  tags: ["autodocs"],
  args: {
    count: 1,
    one: "{{count}} tool",
    other: "{{count}} tools",
  },
} satisfies Meta<typeof AnimatedCountLabel>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: {} }

export const AutoIncrease: Story = {
  args: {},
  render: () => {
    const [count, setCount] = useState(1)
    useEffect(() => {
      const timer = setInterval(() => setCount((v) => (v >= 9 ? 1 : v + 1)), 900)
      return () => clearInterval(timer)
    }, [])
    return <AnimatedCountLabel count={count} one="{{count}} tool" other="{{count}} tools" />
  },
}
