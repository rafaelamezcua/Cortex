import { getLumaStripSignals, type LumaNudge } from "@/lib/actions/reviews"
import { Sparkles, AlertTriangle, Flame, ArrowRight, Calendar } from "lucide-react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"

const toneStyles: Record<
  LumaNudge["tone"],
  { icon: LucideIcon; iconClass: string; dot: string }
> = {
  gentle: {
    icon: Sparkles,
    iconClass: "text-accent",
    dot: "bg-accent/70",
  },
  alert: {
    icon: AlertTriangle,
    iconClass: "text-danger",
    dot: "bg-danger/80",
  },
  celebrate: {
    icon: Flame,
    iconClass: "text-accent",
    dot: "bg-accent/70",
  },
  info: {
    icon: Calendar,
    iconClass: "text-foreground-secondary",
    dot: "bg-foreground-tertiary",
  },
}

export async function LumaStrip() {
  const nudges = await getLumaStripSignals()
  if (nudges.length === 0) return null

  return (
    <section
      aria-label="Luma nudges"
      className="rounded-[--radius-lg] border border-border-light bg-surface/80 p-2 shadow-sm animate-in fade-in duration-500"
    >
      <ul className="flex flex-col gap-0.5">
        {nudges.map((nudge) => {
          const tone = toneStyles[nudge.tone]
          const Icon = tone.icon
          const content = (
            <div className="flex min-w-0 items-start gap-3 rounded-[--radius-md] px-3 py-2.5 transition-colors duration-150 hover:bg-surface-hover">
              <Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconClass}`}
                aria-hidden="true"
              />
              <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-foreground">
                {nudge.message}
              </p>
              {nudge.cta && (
                <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-accent">
                  {nudge.cta.label}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              )}
            </div>
          )

          return (
            <li key={nudge.id}>
              {nudge.cta ? (
                <Link
                  href={nudge.cta.href}
                  className="block rounded-[--radius-md] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
