import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "../button"
import { DropdownMenu } from "./dropdown-menu"

const docs = `### 概览
基于 DropdownMenu 的下拉菜单，支持分组、子菜单、单选与复选项。

### API
- Root 支持常用属性（\`open\`、\`defaultOpen\`、\`onOpenChange\`）。
- 通过 \`Trigger\`、\`Content\`、\`Item\`、\`Separator\`、\`Sub\` 等组合使用。

### 变体与状态
- 支持分组、分割线、嵌套子菜单、checkbox/radio 项。

### 行为
- 从 Trigger 打开菜单，支持 Portal 渲染。

### 可访问性
- 基于 Radix DropdownMenu，提供基础键盘导航和焦点管理。

### 主题与令牌
- 使用 \`data-component="dropdown-menu"\` 与 slot 属性进行样式命中。
`

const meta = {
  title: "Overlay/DropdownMenu",
  id: "components-dropdown-menu",
  tags: ["autodocs"],
  component: DropdownMenu,
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof DropdownMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="small">
          Open menu
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            <DropdownMenu.GroupLabel>Actions</DropdownMenu.GroupLabel>
            <DropdownMenu.Item>
              <DropdownMenu.ItemLabel>New file</DropdownMenu.ItemLabel>
            </DropdownMenu.Item>
            <DropdownMenu.Item>
              <DropdownMenu.ItemLabel>Rename</DropdownMenu.ItemLabel>
              <DropdownMenu.ItemDescription>Shift+R</DropdownMenu.ItemDescription>
            </DropdownMenu.Item>
          </DropdownMenu.Group>
          <DropdownMenu.Separator />
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>More options</DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item>
                  <DropdownMenu.ItemLabel>Duplicate</DropdownMenu.ItemLabel>
                </DropdownMenu.Item>
                <DropdownMenu.Item>
                  <DropdownMenu.ItemLabel>Move</DropdownMenu.ItemLabel>
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  ),
}

export const CheckboxRadio: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="small">
          Open menu
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked>
            <DropdownMenu.ItemLabel>Show line numbers</DropdownMenu.ItemLabel>
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem>
            <DropdownMenu.ItemLabel>Wrap lines</DropdownMenu.ItemLabel>
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.Separator />
          <DropdownMenu.RadioGroup value="compact">
            <DropdownMenu.RadioItem value="compact">
              <DropdownMenu.ItemLabel>Compact</DropdownMenu.ItemLabel>
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="comfortable">
              <DropdownMenu.ItemLabel>Comfortable</DropdownMenu.ItemLabel>
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  ),
}
