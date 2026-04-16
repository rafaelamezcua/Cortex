"use client"

import { useMemo, useState, useTransition } from "react"
import {
  applyReschedule,
  type RescheduleProposal,
} from "@/lib/actions/reviews"
import { CalendarClock, Check, Loader2, X, Flag } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  proposals: RescheduleProposal[]
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

const priorityStyles: Record<
  "low" | "medium" | "high",
  { dot: string; label: string }
> = {
  high: { dot: "bg-danger", label: "High" },
  medium: { dot: "bg-accent/70", label: "Medium" },
  low: { dot: "bg-foreground-tertiary/60", label: "Low" },
}

export function ReschedulePanel({ proposals }: Props) {
  const [keptIds, setKeptIds] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState(false)
  const [status, setStatus] = useState<"idle" | "applied" | "error">("idle")
  const [pending, startTransition] = useTransition()

  const toApply = useMemo(
    () => proposals.filter((p) => !keptIds.has(p.taskId)),
    [proposals, keptIds]
  )

  function toggleKeep(taskId: string) {
    setKeptIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  function handleApply() {
    if (toApply.length === 0 || pending) return
    startTransition(async () => {
      try {
        const payload = toApply.map((p) => ({
          taskId: p.taskId,
          newDue: p.newDue,
        }))
        await applyReschedule(payload)
        setStatus("applied")
      } catch {
        setStatus("error")
      }
    })
  }

  if (dismissed) return null
  if (status === "applied") {
    return (
      <section
        aria-live="polite"
        className="rounded-[--radius-lg] border border-border-light bg-surface/80 px-4 py-3 text-[13.5px] text-foreground-secondary shadow-sm animate-in fade-in duration-300"
      >
        Rescheduled {toApply.length} task{toApply.length === 1 ? "" : "s"}.
      </section>
    )
  }

  return (
    <section
      aria-label="Reschedule overdue tasks"
      className="rounded-[--radius-xl] border border-border-light bg-surface p-5 shadow-sm animate-in fade-in duration-500"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[15px] font-medium text-foreground">
              Sunday reset
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-foreground-secondary">
              {proposals.length} overdue task
              {proposals.length === 1 ? "" : "s"}. Spread them across the week?
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss reschedule panel"
          className="shrink-0 rounded-[--radius-sm] p-1 text-foreground-quaternary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <ul className="mt-4 flex flex-col divide-y divide-border-light/60 rounded-[--radius-md] border border-border-light/60">
        {proposals.map((p) => {
          const kept = keptIds.has(p.taskId)
          const prio = priorityStyles[p.priority]
          return (
            <li
              key={p.taskId}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 transition-opacity duration-150",
                kept && "opacity-50"
              )}
            >
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", prio.dot)}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-foreground">
                  {p.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-foreground-tertiary">
                  <Flag className="h-3 w-3" aria-hidden="true" />
                  {prio.label}
                  <span aria-hidden="true">,</span>
                  <span className="line-through decoration-foreground-quaternary/60">
                    {formatShortDate(p.oldDue)}
                  </span>
                  <span aria-hidden="true">,</span>
                  <span className="font-medium text-accent">
                    {formatShortDate(p.newDue)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleKeep(p.taskId)}
                aria-pressed={kept}
                className={cn(
                  "shrink-0 rounded-[--radius-sm] border px-2.5 py-1 text-[11.5px] font-medium outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
                  kept
                    ? "border-border bg-surface text-foreground-tertiary hover:text-foreground"
                    : "border-border-light bg-background text-foreground-secondary hover:border-accent/40 hover:text-foreground"
                )}
              >
                {kept ? "Keep" : "Apply"}
              </button>
            </li>
          )
        })}
      </ul>

      {status === "error" && (
        <p className="mt-3 text-[12.5px] text-danger">
          Couldn't save those. Try again?
        </p>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-[--radius-md] px-3 py-1.5 text-[12.5px] font-medium text-foreground-secondary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={pending || toApply.length === 0}
          className="inline-flex items-center gap-1.5 rounded-[--radius-md] bg-accent px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-sm outline-none transition-all duration-150 hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Apply {toApply.length === proposals.length ? "all" : `(${toApply.length})`}
        </button>
      </div>
    </section>
  )
}
