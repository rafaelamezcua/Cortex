import { cn } from "@/lib/utils"
import { type HTMLAttributes, forwardRef } from "react"

type CardVariant = "default" | "interactive" | "ghost"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-surface border border-border-light shadow-sm",
  interactive:
    "bg-surface border border-border-light shadow-sm transition-shadow duration-200 hover:shadow-md cursor-pointer",
  ghost: "bg-transparent",
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[--radius-lg] p-5",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = "Card"
