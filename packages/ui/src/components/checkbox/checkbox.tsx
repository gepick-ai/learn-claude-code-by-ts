import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { cva, type VariantProps } from "class-variance-authority"
import { clsx } from "clsx"
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react"

const root = cva(
  "flex shrink-0 items-center justify-center rounded border border-[var(--color-gepick-muted-foreground)] " +
    "bg-[var(--color-gepick-muted)] text-[var(--color-gepick-primary-foreground)] " +
    "transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 " +
    "focus-visible:outline-[var(--color-gepick-primary)] " +
    "data-[state=checked]:border-[var(--color-gepick-primary)] data-[state=checked]:bg-[var(--color-gepick-primary)] " +
    "disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "size-3.5",
        md: "size-4",
        lg: "size-5",
      },
    },
    defaultVariants: { size: "md" },
  },
)

const indicator = cva("text-current")

export type CheckboxProps = ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> &
  VariantProps<typeof root>

export const Checkbox = forwardRef<ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  function Checkbox({ className, size, children, ...props }, ref) {
    return (
      <CheckboxPrimitive.Root ref={ref} className={clsx(root({ size }), className)} {...props}>
        <CheckboxPrimitive.Indicator className={clsx(indicator(), "grid place-content-center")}>
          {children ?? <CheckIcon className="size-3 text-[var(--color-gepick-primary-foreground)]" />}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    )
  },
)

function CheckIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={props.className} aria-hidden>
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
