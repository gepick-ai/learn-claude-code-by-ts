import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useState } from "react"
import { ToolStatusTitle } from "../tool-status-title"
import { AnimatedCountList, type CountItem } from "./tool-count-summary"

const meta = {
  title: "AI/ToolCountSummary",
  id: "components-tool-count-summary",
  component: AnimatedCountList,
  tags: ["autodocs"],
  args: {
    items: [],
    fallback: "",
  },
} satisfies Meta<typeof AnimatedCountList>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: {},
  render: () => {
    const [reads, setReads] = useState(0)
    const [searches, setSearches] = useState(0)
    const [lists, setLists] = useState(0)
    const [active, setActive] = useState(false)

    useEffect(() => {
      if (!active) return
      const timer = setInterval(() => {
        const pick = Math.floor(Math.random() * 3)
        if (pick === 0) setReads((x) => x + 1)
        if (pick === 1) setSearches((x) => x + 1)
        if (pick === 2) setLists((x) => x + 1)
      }, 600)
      return () => clearInterval(timer)
    }, [active])

    const items: CountItem[] = [
      { key: "read", count: reads, one: "{{count}} read", other: "{{count}} reads" },
      { key: "search", count: searches, one: "{{count}} search", other: "{{count}} searches" },
      { key: "list", count: lists, one: "{{count}} list", other: "{{count}} lists" },
    ]

    return (
      <div style={{ display: "grid", gap: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500 }}>
          <ToolStatusTitle active={active} activeText="Exploring" doneText="Explored" split={false} />
          <span style={{ fontWeight: 400, color: "var(--text-base)" }}>
            <AnimatedCountList items={items} fallback="" />
          </span>
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setActive((v) => !v)}>
            {active ? "Stop" : "Simulate"}
          </button>
          <button
            type="button"
            onClick={() => {
              setActive(false)
              setReads(0)
              setSearches(0)
              setLists(0)
            }}
          >
            Reset
          </button>
        </div>
      </div>
    )
  },
}
