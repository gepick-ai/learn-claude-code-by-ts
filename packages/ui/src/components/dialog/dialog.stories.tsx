import * as DialogPrimitive from "@radix-ui/react-dialog"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { I18nProvider } from "../../context/i18n"
import { dict as en } from "../../i18n/en"
import { Button } from "../button"
import { Dialog } from "./dialog"

const i18n = {
  locale: () => "en",
  t: (key: keyof typeof en, params?: Record<string, string | number | boolean>) => {
    const text = en[key] ?? String(key)
    if (!params) return text
    return text.replace(/{{\s*([^}]+?)\s*}}/g, (_, rawKey) => {
      const value = params[String(rawKey)]
      return value === undefined ? "" : String(value)
    })
  },
}

const meta = {
  title: "UI/Overlay/Dialog",
  id: "components-dialog",
  component: Dialog,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <I18nProvider value={i18n}>
        <Story />
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

function Example(props: { size?: "normal" | "large" | "x-large"; fit?: boolean; transition?: boolean; action?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="secondary">Open dialog</Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay data-component="dialog-overlay" />
        <Dialog size={props.size} fit={props.fit} transition={props.transition} title="Dialog" description="Description" action={props.action}>
          <div style={{ padding: 20 }}>Dialog body content.</div>
        </Dialog>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export const Basic: Story = { render: () => <Example /> }
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      <Example size="normal" />
      <Example size="large" />
      <Example size="x-large" />
    </div>
  ),
}
export const Transition: Story = { render: () => <Example transition /> }
export const Fit: Story = { render: () => <Example fit /> }
export const CustomAction: Story = { render: () => <Example action={<Button variant="ghost">Help</Button>} /> }
