import type { Meta, StoryObj } from "@storybook/react"
import { List } from "./list"

const docs = `### Overview
Filterable list with keyboard navigation and optional search input.

Use within panels or popovers where keyboard navigation is expected.

### API
- Required: \`items\` and \`itemKey\`.
- Required: \`children\` render function for items.
- Optional: \`search\`, \`filterKeys\`, \`groupBy\`, \`onSelect\`, \`onKeyEvent\`.

### Variants and states
- Optional search bar and group headers.

### Behavior
- Keyboard navigation via arrow keys; Enter selects.

### Accessibility
- TODO: confirm ARIA roles for list items and search input.

### Theming/tokens
- Uses \`data-component="list"\` and data slots for structure.

`

const meta = {
  title: "Display/List",
  id: "components-list",
  component: List<string>,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
  args: {
    items: ["One", "Two", "Three", "Four"],
    itemKey: (x: string) => x,
    children: (x: string) => x,
    search: true,
  },
} satisfies Meta<typeof List<string>>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: {} }

export const Grouped: Story = {
  render: () => {
    const items = [
      { id: "a1", title: "Alpha", group: "Group A" },
      { id: "a2", title: "Bravo", group: "Group A" },
      { id: "b1", title: "Delta", group: "Group B" },
    ]
    return (
      <List items={items} itemKey={(item) => item.id} groupBy={(item) => item.group} search={true}>
        {(item) => item.title}
      </List>
    )
  },
}

export const Empty: Story = {
  render: () => (
    <List items={[]} itemKey={(item) => item} search={true}>
      {(item) => item}
    </List>
  ),
}

export const WithAdd: Story = {
  render: () => (
    <List
      items={["One", "Two"]}
      itemKey={(item) => item}
      search={true}
      add={{
        render: () => (
          <button type="button" data-slot="list-item">
            Add item
          </button>
        ),
      }}
    >
      {(item) => item}
    </List>
  ),
}

export const Divider: Story = {
  render: () => (
    <List items={["One", "Two", "Three"]} itemKey={(item) => item} divider={true}>
      {(item) => item}
    </List>
  ),
}

export const ActiveIcon: Story = {
  render: () => (
    <List items={["Alpha", "Beta", "Gamma"]} itemKey={(item) => item} activeIcon="chevron-right">
      {(item) => item}
    </List>
  ),
}

export const NoSearch: Story = {
  render: () => (
    <List items={["One", "Two", "Three"]} itemKey={(item) => item} search={false}>
      {(item) => item}
    </List>
  ),
}

export const SearchOptions: Story = {
  render: () => (
    <List
      items={["Apple", "Banana", "Cherry"]}
      itemKey={(item) => item}
      search={{
        placeholder: "Filter...",
        hideIcon: true,
        action: <button type="button">Action</button>,
      }}
    >
      {(item) => item}
    </List>
  ),
}

export const ItemWrapper: Story = {
  render: () => (
    <List
      items={["One", "Two", "Three"]}
      itemKey={(item) => item}
      itemWrapper={(_item, node) => (
        <div style={{ border: "1px solid var(--border-weak-base)", borderRadius: "6px", margin: "4px 0" }}>{node}</div>
      )}
    >
      {(item) => item}
    </List>
  ),
}

export const GroupHeader: Story = {
  render: () => {
    const items = [
      { id: "a1", title: "Alpha", group: "Group A" },
      { id: "b1", title: "Beta", group: "Group B" },
    ]
    return (
      <List items={items} itemKey={(item) => item.id} groupBy={(item) => item.group} groupHeader={(group) => <strong>{group.category}</strong>}>
        {(item) => item.title}
      </List>
    )
  },
}
