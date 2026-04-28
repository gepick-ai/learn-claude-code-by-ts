import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { BasicTool } from "./basic-tool"

const meta = {
  title: "AI/BasicTool",
  id: "components-basic-tool",
  component: BasicTool,
  tags: ["autodocs"],
  args: {
    icon: "mcp",
    defaultOpen: true,
    trigger: {
      title: "Basic Tool",
      subtitle: "Example subtitle",
      args: ["--flag", "value"],
    },
    children: "Details content",
  },
} satisfies Meta<typeof BasicTool>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: {} }

export const Pending: Story = {
  args: {
    status: "pending",
    trigger: {
      title: "Running tool",
      subtitle: "Working...",
    },
    children: "Progress details",
  },
}

export const Locked: Story = {
  args: {
    locked: true,
    trigger: {
      title: "Locked tool",
      subtitle: "Cannot close",
    },
    children: "Locked details",
  },
}

export const Deferred: Story = {
  args: {
    defer: true,
    defaultOpen: false,
    trigger: {
      title: "Deferred tool",
      subtitle: "Content mounts on open",
    },
    children: "Deferred content",
  },
}

export const ForceOpen: Story = {
  args: {
    forceOpen: true,
    trigger: {
      title: "Forced open",
      subtitle: "Cannot close",
    },
    children: "Forced content",
  },
}

export const HideDetails: Story = {
  args: {
    hideDetails: true,
    trigger: {
      title: "Summary only",
      subtitle: "Details hidden",
    },
    children: "Hidden content",
  },
}

export const SubtitleAction: Story = {
  args: {},
  render: () => {
    const [msg, setMsg] = useState("Subtitle not clicked")
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--text-weak)" }}>{msg}</div>
        <BasicTool
          icon="mcp"
          trigger={{ title: "Clickable subtitle", subtitle: "Click me" }}
          onSubtitleClick={() => setMsg("Subtitle clicked")}
        >
          Subtitle action details
        </BasicTool>
      </div>
    )
  },
}
