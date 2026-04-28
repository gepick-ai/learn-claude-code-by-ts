import { cva, type VariantProps } from "class-variance-authority"
import { clsx } from "clsx"
import { forwardRef, type ButtonHTMLAttributes, type Ref } from "react"

const variants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-gepick-primary)] " +
    "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-[var(--color-gepick-primary)] text-[var(--color-gepick-primary-foreground)] hover:opacity-90",
        secondary: "bg-[var(--color-gepick-muted)] text-[var(--color-gepick-muted-foreground)] hover:opacity-90",
        ghost: "bg-transparent hover:bg-[var(--color-gepick-muted)]",
      },
      size: {
        sm: "h-8 px-2.5",
        md: "h-9 px-3",
        lg: "h-10 px-4",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variants>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, type = "button", variant, size, ...rest },
  ref: Ref<HTMLButtonElement>,
) {
  return (
    <button
      type={type}
      className={clsx(variants({ variant, size }), className)}
      ref={ref}
      {...rest}
    />
  )
})
