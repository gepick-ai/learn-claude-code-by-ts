import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useState } from "react"
import { TextReveal } from "./text-reveal"

const docs = `### Overview
Playground for the TextReveal text transition component.

**Hybrid** — mask wipe + vertical slide: gradient sweeps AND text moves downward.

**Wipe only** — pure mask wipe: gradient sweeps top-to-bottom, text stays in place.
`

const list = [
  "Refactor ToolStatusTitle DOM measurement",
  "Remove inline measure nodes",
  "Run typechecks and report changes",
  "Verify reduced-motion behavior",
  "Review diff for animation edge cases",
  "Check keyboard semantics",
  undefined,
  "Planning key generation details",
  "Analyzing error handling",
  "Considering edge cases",
]

const btn = (accent?: boolean) =>
  ({
    padding: "5px 12px",
    borderRadius: "6px",
    border: accent ? "1px solid var(--color-accent, #58f)" : "1px solid var(--color-divider, #333)",
    background: accent ? "var(--color-accent, #58f)" : "var(--color-fill-element, #222)",
    color: "var(--color-text, #eee)",
    cursor: "pointer",
    fontSize: "12px",
  }) as const

const sliderLabel = {
  width: "90px",
  fontSize: "12px",
  color: "var(--color-text-secondary, #a3a3a3)",
  flexShrink: "0",
} as const

const cardStyle = {
  padding: "20px 24px",
  borderRadius: "10px",
  border: "1px solid var(--color-divider, #333)",
  background: "var(--color-fill-element, #1a1a1a)",
  display: "grid",
  gap: "12px",
} as const

const cardLabel = {
  fontSize: "11px",
  fontFamily: "monospace",
  color: "var(--color-text-weak, #666)",
} as const

const previewRow = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "14px",
  fontWeight: "500",
  lineHeight: "20px",
  color: "var(--text-weak, #aaa)",
  minHeight: "20px",
  overflow: "visible",
} as const

const headingSlot = {
  minWidth: "0",
  overflow: "visible",
  color: "var(--text-weaker, #888)",
  fontWeight: "400",
} as const

const meta = {
  title: "UI/AI/TextReveal",
  id: "components-text-reveal",
  component: TextReveal,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof TextReveal>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: {},
  render: () => {
    const [idx, setIdx] = useState(0)
    const [run, setRun] = useState(false)
    const [grow, setGrow] = useState(true)
    const [duration, setDuration] = useState(600)
    const [bounce, setBounce] = useState(1)
    const [bounceSoft, setBounceSoft] = useState(1)
    const [hybridTravel, setHybridTravel] = useState(25)
    const [hybridEdge, setHybridEdge] = useState(17)
    const [edge, setEdge] = useState(17)
    const [travel, setTravel] = useState(0)
    const text = list[idx]

    useEffect(() => {
      if (!run) return
      const tick = () => setIdx((v) => (v + 1) % list.length)
      const timer = setInterval(tick, 1000)
      return () => {
        clearInterval(timer)
      }
    }, [run])

    const spring = `cubic-bezier(0.34, ${bounce}, 0.64, 1)`
    const springSoft = `cubic-bezier(0.34, ${bounceSoft}, 0.64, 1)`

    return (
      <div style={{ display: "grid", gap: "24px", padding: "20px", maxWidth: "700px" }}>
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={cardStyle}>
            <span style={cardLabel}>text-reveal (mask wipe + slide)</span>
            <div style={previewRow}>
              <span>Thinking</span>
              <span style={headingSlot}>
                <TextReveal
                  className="text-14-regular"
                  text={text}
                  duration={duration}
                  edge={hybridEdge}
                  travel={hybridTravel}
                  spring={spring}
                  springSoft={springSoft}
                  growOnly={grow}
                />
              </span>
            </div>
          </div>
          <div style={cardStyle}>
            <span style={cardLabel}>text-reveal (mask wipe only)</span>
            <div style={previewRow}>
              <span>Thinking</span>
              <span style={headingSlot}>
                <TextReveal
                  className="text-14-regular"
                  text={text}
                  duration={duration}
                  edge={edge}
                  travel={travel}
                  spring={spring}
                  springSoft={springSoft}
                  growOnly={grow}
                />
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {list.map((item, i) => (
            <button key={i} type="button" onClick={() => setIdx(i)} style={btn(idx === i)}>
              {item ?? "(none)"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={() => setIdx((v) => (v - 1 + list.length) % list.length)} style={btn()}>
            Prev
          </button>
          <button type="button" onClick={() => setIdx((v) => (v + 1) % list.length)} style={btn()}>
            Next
          </button>
          <button type="button" onClick={() => setRun((v) => !v)} style={btn(run)}>
            {run ? "Stop cycle" : "Auto cycle"}
          </button>
          <button type="button" onClick={() => setGrow((v) => !v)} style={btn(grow)}>
            {grow ? "growOnly: on" : "growOnly: off"}
          </button>
        </div>
        <div style={{ display: "grid", gap: "8px", maxWidth: "480px" }}>
          <div style={{ fontSize: "11px", color: "var(--color-text-weak, #666)" }}>Hybrid (wipe + slide)</div>
          <label style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={sliderLabel}>edge</span>
            <input type="range" min={1} max={40} step={1} value={hybridEdge} onChange={(e) => setHybridEdge(e.target.valueAsNumber)} style={{ flex: 1 }} />
            <span style={{ width: "60px", textAlign: "right", fontSize: "12px" }}>{hybridEdge}%</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={sliderLabel}>travel</span>
            <input type="range" min={0} max={40} step={1} value={hybridTravel} onChange={(e) => setHybridTravel(e.target.valueAsNumber)} style={{ flex: 1 }} />
            <span style={{ width: "60px", textAlign: "right", fontSize: "12px" }}>{hybridTravel}px</span>
          </label>
          <div style={{ fontSize: "11px", color: "var(--color-text-weak, #666)", marginTop: "8px" }}>Shared</div>
          <label style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={sliderLabel}>duration</span>
            <input type="range" min={100} max={1400} step={10} value={duration} onChange={(e) => setDuration(e.target.valueAsNumber)} style={{ flex: 1 }} />
            <span style={{ width: "60px", textAlign: "right", fontSize: "12px" }}>{duration}ms</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={sliderLabel}>bounce</span>
            <input type="range" min={1} max={2} step={0.01} value={bounce} onChange={(e) => setBounce(e.target.valueAsNumber)} style={{ flex: 1 }} />
            <span style={{ width: "60px", textAlign: "right", fontSize: "12px" }}>{bounce.toFixed(2)}</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={sliderLabel}>bounce soft</span>
            <input type="range" min={1} max={1.5} step={0.01} value={bounceSoft} onChange={(e) => setBounceSoft(e.target.valueAsNumber)} style={{ flex: 1 }} />
            <span style={{ width: "60px", textAlign: "right", fontSize: "12px" }}>{bounceSoft.toFixed(2)}</span>
          </label>
          <div style={{ fontSize: "11px", color: "var(--color-text-weak, #666)", marginTop: "8px" }}>Wipe only</div>
          <label style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={sliderLabel}>edge</span>
            <input type="range" min={1} max={40} step={1} value={edge} onChange={(e) => setEdge(e.target.valueAsNumber)} style={{ flex: 1 }} />
            <span style={{ width: "60px", textAlign: "right", fontSize: "12px" }}>{edge}%</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={sliderLabel}>travel</span>
            <input type="range" min={0} max={16} step={1} value={travel} onChange={(e) => setTravel(e.target.valueAsNumber)} style={{ flex: 1 }} />
            <span style={{ width: "60px", textAlign: "right", fontSize: "12px" }}>{travel}px</span>
          </label>
        </div>
        <div style={{ fontSize: "11px", color: "var(--color-text-weak, #888)", fontFamily: "monospace" }}>
          text: {text ?? "(none)"} · growOnly: {grow ? "on" : "off"}
        </div>
      </div>
    )
  },
}
