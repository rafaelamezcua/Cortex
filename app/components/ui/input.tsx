"use client"

import { cn } from "@/lib/utils"
import { type InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-foreground-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-10 w-full rounded-[--radius-md] border bg-surface px-3 text-sm text-foreground",
            "placeholder:text-foreground-quaternary",
            "outline-none transition-colors duration-150",
            "focus:border-accent focus:ring-2 focus:ring-accent/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-danger" : "border-border",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-danger">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"
