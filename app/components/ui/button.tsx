"use client"

import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { type ButtonHTMLAttributes, forwardRef } from "react"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-sm hover:bg-accent-hover hover:shadow-md active:scale-[0.97]",
  secondary:
    "bg-surface border border-border text-foreground hover:bg-surface-hover hover:border-accent/30 active:scale-[0.97]",
  ghost:
    "text-foreground-secondary hover:bg-surface-hover hover:text-foreground active:bg-surface-active",
  danger:
    "bg-danger text-white shadow-sm hover:opacity-90 active:scale-[0.97]",
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-[13px] gap-1.5 rounded-[--radius-md]",
  md: "h-10 px-5 text-sm gap-2 rounded-[--radius-md]",
  lg: "h-12 px-6 text-[15px] gap-2.5 rounded-[--radius-lg]",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200",
          "outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:opacity-40 disabled:pointer-events-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"
