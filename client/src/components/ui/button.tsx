import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium " +
  "transition-all duration-200 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "cursor-pointer " +
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground " +
          "shadow-[0_1px_2px_0_rgb(0,0,0,0.05)] " +
          "hover:bg-primary/90 hover:shadow-[0_2px_4px_0_rgb(0,0,0,0.1)] " +
          "active:scale-[0.98] active:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground " +
          "shadow-[0_1px_2px_0_rgb(0,0,0,0.05)] " +
          "hover:bg-destructive/90 hover:shadow-[0_2px_4px_0_rgb(0,0,0,0.1)] " +
          "active:scale-[0.98]",
        outline:
          "border border-border bg-background " +
          "hover:bg-accent hover:border-border/60 " +
          "active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground " +
          "hover:bg-secondary/80 " +
          "active:scale-[0.98]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground " +
          "active:scale-[0.98]",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 rounded-lg",
        sm: "h-9 px-4 text-xs rounded-md",
        lg: "h-12 px-8 text-base rounded-lg",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
