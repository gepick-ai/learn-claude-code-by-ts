import type { Meta, StoryObj } from "@storybook/react"
import { FileIcon } from "./file-icon"

const meta = {
  title: "Display/FileIcon",
  id: "components-file-icon",
  component: FileIcon,
  tags: ["autodocs"],
  args: {
    node: { path: "package.json", type: "file" },
    mono: true,
  },
} satisfies Meta<typeof FileIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: {} }

export const Folder: Story = {
  args: {
    node: { path: "src", type: "directory" },
    expanded: true,
    mono: false,
  },
}

export const Samples: Story = {
  args: {},
  render: () => {
    const items = [
      { path: "README.md", type: "file" as const },
      { path: "package.json", type: "file" as const },
      { path: "tsconfig.json", type: "file" as const },
      { path: "index.ts", type: "file" as const },
      { path: "styles.css", type: "file" as const },
      { path: "logo.svg", type: "file" as const },
      { path: "photo.png", type: "file" as const },
      { path: "Dockerfile", type: "file" as const },
      { path: ".env", type: "file" as const },
      { path: "src", type: "directory" as const },
      { path: "public", type: "directory" as const },
    ]
    return (
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
        {items.map((node) => (
          <div key={node.path} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <FileIcon node={node} mono={false} />
            <div style={{ fontSize: 12, color: "var(--text-weak)" }}>{node.path}</div>
          </div>
        ))}
      </div>
    )
  },
}
