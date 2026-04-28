import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Select } from "./select"

const docs = `### Overview
Select menu for choosing a single option with optional grouping.

Use \`children\` to customize option rendering.

### API
- Required: \`options\`.
- Optional: \`current\`, \`placeholder\`, \`value\`, \`label\`, \`groupBy\`.
- Accepts Button props for the trigger (\`variant\`, \`size\`).

### Variants and states
- Trigger supports "settings" style via \`triggerVariant\`.

### Behavior
- Uses Kobalte Select with optional item highlight callbacks.

### Accessibility
- TODO: confirm keyboard navigation and aria attributes from Kobalte.

### Theming/tokens
- Uses \`data-component="select"\` with slot attributes.

`

const meta = {
  title: "Form/Select",
  id: "components-select",
  component: Select<string>,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    options: ["One", "Two", "Three"],
    current: "One",
    placeholder: "Choose...",
    variant: "secondary",
    size: "normal",
  },
  argTypes: {
    triggerVariant: {
      control: "select",
      options: ["settings", undefined],
    },
  },
} satisfies Meta<typeof Select<string>>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {},
  render: (args) => {
    const [value, setValue] = useState(args.current)
    return <Select {...args} current={value} onSelect={setValue} />
  },
}

export const Grouped: Story = {
  args: {},
  render: () => {
    const options = [
      { id: "alpha", label: "Alpha", group: "Group A" },
      { id: "bravo", label: "Bravo", group: "Group A" },
      { id: "delta", label: "Delta", group: "Group B" },
    ]
    return (
      <Select
        options={options}
        current={options[0]}
        value={(item) => item.id}
        label={(item) => item.label}
        groupBy={(item) => item.group}
        placeholder="Choose..."
        variant="secondary"
      />
    )
  },
}

export const SettingsTrigger: Story = {
  args: {
    triggerVariant: "settings",
  },
}

export const CustomRender: Story = {
  args: {},
  render: () => (
    <Select options={["Primary", "Secondary", "Ghost"]} current="Primary" placeholder="Choose..." variant="secondary">
      {(item) => <span style={{ textTransform: "uppercase" }}>{item}</span>}
    </Select>
  ),
}

export const CustomTriggerStyle: Story = {
  args: {
    triggerStyle: { minWidth: "180px", justifyContent: "space-between" },
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}
