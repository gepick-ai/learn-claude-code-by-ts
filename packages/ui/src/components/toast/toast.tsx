import * as ToastPrimitive from "@radix-ui/react-toast"
import { type ComponentProps, type ReactNode, useSyncExternalStore } from "react"
import { Icon, type IconName } from "../icon"

type Item = {
  id: string
  node: ReactNode
}

const state: { list: Item[] } = { list: [] }
const subs = new Set<() => void>()

function emit() {
  for (const fn of subs) fn()
}

function update(next: Item[]) {
  state.list = next
  emit()
}

function add(node: ReactNode) {
  const id = crypto.randomUUID()
  update([...state.list, { id, node }])
  return id
}

function replace(id: string, node: ReactNode) {
  update(state.list.map((item) => (item.id === id ? { ...item, node } : item)))
}

function dismiss(id: string) {
  update(state.list.filter((item) => item.id !== id))
}

function useToasts() {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    () => state.list,
    () => state.list,
  )
}

export interface ToastRegionProps extends ComponentProps<typeof ToastPrimitive.Viewport> {}

function ToastRegion(props: ToastRegionProps) {
  const list = useToasts()
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {list.map((item) => item.node)}
      <ToastPrimitive.Viewport data-component="toast-region" data-slot="toast-list" {...props} />
    </ToastPrimitive.Provider>
  )
}

export interface ToastRootProps extends ComponentProps<typeof ToastPrimitive.Root> {
  toastId: string
}

function ToastRoot(props: ToastRootProps) {
  const { toastId, onOpenChange, ...rest } = props
  return (
    <ToastPrimitive.Root
      data-component="toast"
      onOpenChange={(open) => {
        onOpenChange?.(open)
        if (!open) dismiss(toastId)
      }}
      {...rest}
    />
  )
}

function ToastIcon(props: { name: IconName }) {
  return (
    <div data-slot="toast-icon">
      <Icon name={props.name} />
    </div>
  )
}

function ToastContent(props: ComponentProps<"div">) {
  return <div data-slot="toast-content" {...props} />
}

function ToastTitle(props: ComponentProps<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title data-slot="toast-title" {...props} />
}

function ToastDescription(props: ComponentProps<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description data-slot="toast-description" {...props} />
}

function ToastActions(props: ComponentProps<"div">) {
  return <div data-slot="toast-actions" {...props} />
}

function ToastCloseButton(props: ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close data-slot="toast-close-button" asChild {...props}>
      <button type="button" aria-label="dismiss">
        <Icon name="close-small" size="small" />
      </button>
    </ToastPrimitive.Close>
  )
}

function ToastProgressTrack(props: ComponentProps<"div">) {
  return <div data-slot="toast-progress-track" {...props} />
}

function ToastProgressFill(props: ComponentProps<"div">) {
  return <div data-slot="toast-progress-fill" {...props} />
}

export const Toast = Object.assign(ToastRoot, {
  Region: ToastRegion,
  Icon: ToastIcon,
  Content: ToastContent,
  Title: ToastTitle,
  Description: ToastDescription,
  Actions: ToastActions,
  CloseButton: ToastCloseButton,
  ProgressTrack: ToastProgressTrack,
  ProgressFill: ToastProgressFill,
})

type PromiseState = "pending" | "fulfilled" | "rejected"
type PromisePayload<T, U> = { state: PromiseState; data?: T; error?: U }

export const toaster = {
  show(render: (props: { toastId: string }) => ReactNode) {
    return add(render({ toastId: crypto.randomUUID() }))
  },
  dismiss,
  promise<T, U = unknown>(
    promise: Promise<T> | (() => Promise<T>),
    render: (props: PromisePayload<T, U> & { toastId: string }) => ReactNode,
  ) {
    const id = crypto.randomUUID()
    add(render({ toastId: id, state: "pending" }))
    const task = typeof promise === "function" ? promise() : promise
    return task
      .then((data) => {
        replace(id, render({ toastId: id, state: "fulfilled", data }))
        return data
      })
      .catch((error: U) => {
        replace(id, render({ toastId: id, state: "rejected", error }))
        throw error
      })
  },
}

export type ToastVariant = "default" | "success" | "error" | "loading"

export interface ToastAction {
  label: string
  onClick: "dismiss" | (() => void)
}

export interface ToastOptions {
  title?: string
  description?: string
  icon?: IconName
  variant?: ToastVariant
  duration?: number
  persistent?: boolean
  actions?: ToastAction[]
}

export function showToast(options: ToastOptions | string) {
  const opts = typeof options === "string" ? { description: options } : options
  const id = crypto.randomUUID()
  add(
    <Toast toastId={id} duration={opts.persistent ? Infinity : opts.duration} data-variant={opts.variant ?? "default"}>
      {opts.icon ? <Toast.Icon name={opts.icon} /> : null}
      <Toast.Content>
        {opts.title ? <Toast.Title>{opts.title}</Toast.Title> : null}
        {opts.description ? <Toast.Description>{opts.description}</Toast.Description> : null}
        {opts.actions?.length ? (
          <Toast.Actions>
            {opts.actions.map((action) => (
              <button
                key={action.label}
                data-slot="toast-action"
                onClick={() => {
                  if (typeof action.onClick === "function") action.onClick()
                  dismiss(id)
                }}
              >
                {action.label}
              </button>
            ))}
          </Toast.Actions>
        ) : null}
      </Toast.Content>
      <Toast.CloseButton />
    </Toast>,
  )
  return id
}

export interface ToastPromiseOptions<T, U = unknown> {
  loading?: ReactNode
  success?: (data: T) => ReactNode
  error?: (error: U) => ReactNode
}

export function showPromiseToast<T, U = unknown>(promise: Promise<T> | (() => Promise<T>), options: ToastPromiseOptions<T, U>) {
  return toaster.promise<T, U>(promise, (props) => (
    <Toast toastId={props.toastId} data-variant={props.state === "pending" ? "loading" : props.state === "fulfilled" ? "success" : "error"}>
      <Toast.Content>
        <Toast.Description>
          {props.state === "pending" ? options.loading : null}
          {props.state === "fulfilled" ? options.success?.(props.data as T) : null}
          {props.state === "rejected" ? options.error?.(props.error as U) : null}
        </Toast.Description>
      </Toast.Content>
      <Toast.CloseButton />
    </Toast>
  ))
}
