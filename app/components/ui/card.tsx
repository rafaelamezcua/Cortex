import { cn } from "@/lib/utils"
import { type HTMLAttributes, forwardRef } from "react"

type CardVariant = "default" | "interactive" | "ghost"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const variantStyles: Record<CardVariant, string> = {
  default:
    "bg-surface border border-border-light/60 shadow-sm backdrop-blur-sm",
  interactive:
    "bg-surface border border-border-light/60 shadow-sm backdrop-blur-sm cursor-pointer hover:shadow-md hover:border-accent/20 hover:scale-[1.01] active:scale-[0.99]",
  ghost: "bg-transparent",
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[--radius-xl] p-6 transition-all duration-200",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = "Card"
