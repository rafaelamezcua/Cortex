"use client"

import { cn } from "@/lib/utils"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/app/components/theme-provider"

interface ThemeToggleProps {
  /** Compact = icon only; full = icon + label. */
  compact?: boolean
  className?: string
}

/**
 * A small sun/moon toggle that flips light <-> dark.
 * Choice is persisted in localStorage via the ThemeProvider.
 * Initial state honors prefers-color-scheme when nothing is stored.
 */
export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  const { resolved, setTheme } = useTheme()
  const isDark = resolved === "dark"
  const next = isDark ? "light" : "dark"
  const label = isDark ? "Switch to light mode" : "Switch to dark mode"

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={cn(
        "group relative inline-flex items-center gap-3 rounded-[--radius-md] text-foreground-tertiary transition-colors duration-200",
        "hover:bg-surface-hover hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)] focus-visible:ring-offset-0",
        compact
          ? "h-10 w-10 justify-center"
          : "h-11 w-full justify-center px-3 text-[13px] font-medium",
        className,
      )}
    >
      {/* Sun + moon stack: cross-fade with transform + opacity only. */}
      <span
        aria-hidden="true"
        className="relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center"
      >
        <Sun
          className={cn(
            "absolute h-[18px] w-[18px] transition-[opacity,transform] duration-[--duration-normal] ease-[--ease-out]",
            isDark
              ? "opacity-0 -rotate-90 scale-75"
              : "opacity-100 rotate-0 scale-100",
          )}
        />
        <Moon
          className={cn(
            "absolute h-[18px] w-[18px] transition-[opacity,transform] duration-[--duration-normal] ease-[--ease-out]",
            isDark
              ? "opacity-100 rotate-0 scale-100"
              : "opacity-0 rotate-90 scale-75",
          )}
        />
      </span>
      {!compact && <span>{isDark ? "Dark" : "Light"}</span>}
    </button>
  )
}
