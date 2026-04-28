import type { Meta, StoryObj } from "@storybook/react"
import { useRef, useState } from "react"
import { FileSearchBar } from "./file-search"

const meta = {
  title: "UI/AI/FileSearchBar",
  id: "components-file-search",
  component: FileSearchBar,
  tags: ["autodocs"],
  args: {
    pos: () => ({ top: 48, right: 24 }),
    query: () => "",
    index: () => 0,
    count: () => 0,
    setInput: { current: null },
    onInput: () => {},
    onKeyDown: () => {},
    onClose: () => {},
    onPrev: () => {},
    onNext: () => {},
  },
} satisfies Meta<typeof FileSearchBar>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {},
  render: () => {
    const input = useRef<HTMLInputElement>(null)
    const [query, setQuery] = useState("")
    const [index, setIndex] = useState(0)
    const count = 8
    return (
      <div style={{ height: 160, position: "relative" }}>
        <FileSearchBar
          pos={() => ({ top: 48, right: 24 })}
          query={() => query}
          index={() => index}
          count={() => count}
          setInput={input}
          onInput={setQuery}
          onKeyDown={() => {}}
          onClose={() => setQuery("")}
          onPrev={() => setIndex((v) => (v - 1 + count) % count)}
          onNext={() => setIndex((v) => (v + 1) % count)}
        />
      </div>
    )
  },
}
