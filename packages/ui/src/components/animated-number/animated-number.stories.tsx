import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useState } from "react"
import { AnimatedNumber } from "./animated-number"

const meta = {
  title: "UI/AI/AnimatedNumber",
  id: "components-animated-number",
  component: AnimatedNumber,
  tags: ["autodocs"],
  args: {
    value: 42,
  },
} satisfies Meta<typeof AnimatedNumber>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {},
}

export const AutoIncrease: Story = {
  args: {},
  render: () => {
    const [value, setValue] = useState(0)
    useEffect(() => {
      const timer = setInterval(() => setValue((x) => x + 1), 800)
      return () => clearInterval(timer)
    }, [])
    return <AnimatedNumber value={value} />
  },
}
