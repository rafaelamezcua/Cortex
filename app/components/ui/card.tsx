import { cn } from "@/lib/utils"
import { type HTMLAttributes, forwardRef } from "react"

type CardVariant = "default" | "interactive" | "glass" | "hearth" | "ghost"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const variantStyles: Record<CardVariant, string> = {
  default:
    "bg-surface border border-border-light shadow-sm",
  interactive:
    "bg-surface border border-border-light shadow-sm cursor-pointer hover:bg-surface-raised hover:border-accent/40 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
  glass:
    "bg-glass-surface backdrop-blur-xl border border-border-light shadow-sm",
  hearth:
    "bg-surface border border-accent/25 shadow-[var(--shadow-hearth)]",
  ghost: "bg-transparent",
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[--radius-xl] p-6 transition-all duration-300 ease-out",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = "Card"
