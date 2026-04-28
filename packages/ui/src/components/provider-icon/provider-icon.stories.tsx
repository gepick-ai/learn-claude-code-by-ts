import type { Meta, StoryObj } from "@storybook/react"
import { ProviderIcon } from "./provider-icon"
import { iconNames } from "./icon/types"

const docs = `### 概览
Provider 图标渲染组件，基于 SVG sprite 按 id 输出图标。

### API
- 必填：\`id\`
- 其余：标准 \`svg\` 属性
`

const meta = {
  title: "UI/Brand/ProviderIcon",
  id: "components-provider-icon",
  component: ProviderIcon,
  tags: ["autodocs"],
  args: {
    id: "openai",
  },
  argTypes: {
    id: {
      control: "select",
      options: iconNames,
    },
  },
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof ProviderIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {},
}

export const AllIcons: Story = {
  args: {},
  render: () => (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))" }}>
      {iconNames.map((id) => (
        <div key={id} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
          <ProviderIcon id={id} width={28} height={28} aria-label={id} />
          <div style={{ fontSize: 10, color: "var(--text-weak)", textAlign: "center" }}>{id}</div>
        </div>
      ))}
    </div>
  ),
}
