import type { WeekStats } from "@/lib/actions/focus"

function formatHoursMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m"
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function WeeklyStats({ stats }: { stats: WeekStats }) {
  const isEmpty = stats.sessionCount === 0

  if (isEmpty) {
    return (
      <section
        aria-labelledby="focus-week-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex items-baseline justify-between">
          <h2
            id="focus-week-heading"
            className="text-sm font-semibold uppercase tracking-wider text-foreground-tertiary"
          >
            This week
          </h2>
        </div>
        <div className="rounded-[--radius-lg] border border-dashed border-border bg-surface/50 p-6 text-center">
          <p className="text-[14px] leading-relaxed text-foreground-secondary">
            Start your first focus session to see your stats here.
          </p>
        </div>
      </section>
    )
  }

  const topTasks = stats.tasks.slice(0, 4)

  return (
    <section
      aria-labelledby="focus-week-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex items-baseline justify-between">
        <h2
          id="focus-week-heading"
          className="text-sm font-semibold uppercase tracking-wider text-foreground-tertiary"
        >
          This week
        </h2>
      </div>

      {/* Numeric cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Sessions"
          value={String(stats.sessionCount)}
          hint={stats.sessionCount === 1 ? "completed" : "completed"}
        />
        <StatCard
          label="Total focus"
          value={formatHoursMinutes(stats.totalMinutes)}
          hint={stats.totalMinutes === 1 ? "minute" : "minutes"}
          hideHint
        />
      </div>

      {/* Task breakdown */}
      <div className="flex flex-col gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-tertiary">
          Worked on
        </h3>
        <ul className="flex flex-col gap-1.5">
          {topTasks.map((t) => (
            <li
              key={t.taskId ?? "unlinked"}
              className="flex items-center justify-between gap-3 rounded-[--radius-md] border border-border-light bg-surface px-3.5 py-2.5"
            >
              <span className="truncate text-[14px] text-foreground">
                {t.taskTitle ?? "Unlinked sessions"}
              </span>
              <span className="shrink-0 text-[12px] tabular-nums text-foreground-tertiary">
                {t.sessionCount}
                <span className="mx-1 text-foreground-quaternary">·</span>
                {formatHoursMinutes(Math.round(t.totalSeconds / 60))}
              </span>
            </li>
          ))}
        </ul>
        {stats.tasks.length > topTasks.length && (
          <p className="text-[12px] text-foreground-tertiary">
            +{stats.tasks.length - topTasks.length} more
          </p>
        )}
      </div>
    </section>
  )
}

function StatCard({
  label,
  value,
  hint,
  hideHint,
}: {
  label: string
  value: string
  hint: string
  hideHint?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[--radius-lg] border border-border-light bg-surface p-4 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-tertiary">
        {label}
      </span>
      <span
        className="text-[28px] font-normal leading-none tabular-nums text-foreground"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {value}
      </span>
      {!hideHint && (
        <span className="text-[12px] text-foreground-tertiary">{hint}</span>
      )}
    </div>
  )
}
