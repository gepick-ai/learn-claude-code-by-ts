import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useState } from "react"
import { ToolStatusTitle } from "./tool-status-title"

const meta = {
  title: "AI/ToolStatusTitle",
  id: "components-tool-status-title",
  component: ToolStatusTitle,
  tags: ["autodocs"],
  args: {
    active: true,
    activeText: "Thinking through implementation details",
    doneText: "Implemented and verified",
    split: true,
  },
} satisfies Meta<typeof ToolStatusTitle>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: {} }

export const Toggle: Story = {
  args: {},
  render: () => {
    const [active, setActive] = useState(true)
    useEffect(() => {
      const timer = setInterval(() => setActive((v) => !v), 2000)
      return () => clearInterval(timer)
    }, [])
    return <ToolStatusTitle active={active} activeText="Refactoring title transitions" doneText="Refactor complete" split />
  },
}
