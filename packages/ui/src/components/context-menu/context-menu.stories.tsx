import type { Meta, StoryObj } from "@storybook/react"
import { ContextMenu } from "./context-menu"

const docs = `### 概览
用于右键菜单场景，支持分组、子菜单、复选与单选项。

### API
- Root 支持 ContextMenu 常用属性（\`open\`、\`defaultOpen\`、\`onOpenChange\`）。
- 通过 \`Trigger\`、\`Content\`、\`Item\`、\`Separator\`、\`Sub\` 等组合使用。

### 变体与状态
- 支持分组、子菜单、checkbox/radio 项。

### 行为
- 在 Trigger 区域执行上下文菜单手势时打开。

### 可访问性
- 基于 Radix ContextMenu，支持基础键盘与焦点管理。

### 主题与令牌
- 使用 \`data-component="context-menu"\` 与 slot 属性命中样式。
`

const panel = {
  padding: 20,
  border: "1px dashed var(--border-weak-base)",
  borderRadius: 8,
  color: "var(--text-weak)",
}

const meta = {
  title: "UI/Overlay/ContextMenu",
  id: "components-context-menu",
  tags: ["autodocs"],
  component: ContextMenu,
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
} satisfies Meta<typeof ContextMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenu.Trigger>
        <div style={panel}>Right click here</div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content>
          <ContextMenu.Group>
            <ContextMenu.GroupLabel>Actions</ContextMenu.GroupLabel>
            <ContextMenu.Item>
              <ContextMenu.ItemLabel>Copy</ContextMenu.ItemLabel>
            </ContextMenu.Item>
            <ContextMenu.Item>
              <ContextMenu.ItemLabel>Paste</ContextMenu.ItemLabel>
            </ContextMenu.Item>
          </ContextMenu.Group>
          <ContextMenu.Separator />
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger>More</ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent>
                <ContextMenu.Item>
                  <ContextMenu.ItemLabel>Duplicate</ContextMenu.ItemLabel>
                </ContextMenu.Item>
                <ContextMenu.Item>
                  <ContextMenu.ItemLabel>Move</ContextMenu.ItemLabel>
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu>
  ),
}

export const CheckboxRadio: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenu.Trigger>
        <div style={panel}>Right click here</div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content>
          <ContextMenu.CheckboxItem checked>
            <ContextMenu.ItemLabel>Show line numbers</ContextMenu.ItemLabel>
          </ContextMenu.CheckboxItem>
          <ContextMenu.CheckboxItem>
            <ContextMenu.ItemLabel>Wrap lines</ContextMenu.ItemLabel>
          </ContextMenu.CheckboxItem>
          <ContextMenu.Separator />
          <ContextMenu.RadioGroup value="compact">
            <ContextMenu.RadioItem value="compact">
              <ContextMenu.ItemLabel>Compact</ContextMenu.ItemLabel>
            </ContextMenu.RadioItem>
            <ContextMenu.RadioItem value="comfortable">
              <ContextMenu.ItemLabel>Comfortable</ContextMenu.ItemLabel>
            </ContextMenu.RadioItem>
          </ContextMenu.RadioGroup>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu>
  ),
}
