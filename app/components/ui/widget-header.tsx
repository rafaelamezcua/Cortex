import { cn } from "@/lib/utils"
import { ArrowRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

interface WidgetHeaderProps {
  icon: LucideIcon
  label: string
  subtitle?: ReactNode
  showArrow?: boolean
  arrowHref?: string
  className?: string
}

export function WidgetHeader({
  icon: Icon,
  label,
  subtitle,
  showArrow = false,
  arrowHref,
  className,
}: WidgetHeaderProps) {
  const arrow =
    showArrow || arrowHref ? (
      <ArrowRight className="h-4 w-4 shrink-0 text-foreground-quaternary transition-colors duration-150 hover:text-accent" />
    ) : null

  return (
    <div className={cn("flex items-center justify-between mb-5", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[--radius-md] bg-accent-light">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground-tertiary">
            {label}
          </h2>
          {subtitle && (
            <p className="truncate text-xs text-foreground-quaternary">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {arrowHref ? <Link href={arrowHref}>{arrow}</Link> : arrow}
    </div>
  )
}
