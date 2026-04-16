import { cn, formatRelativeDate } from "@/lib/utils"

interface Run {
  id: string
  ruleId: string
  status: "success" | "error" | "skipped"
  details: string | null
  ranAt: string
}

const STATUS_STYLES: Record<Run["status"], string> = {
  success: "bg-[rgba(126,167,126,0.15)] text-[color:var(--success)]",
  error: "bg-danger/15 text-danger",
  skipped: "bg-surface-active text-foreground-tertiary",
}

export function RunsPanel({
  runs,
  ruleNames,
}: {
  runs: Run[]
  ruleNames: Record<string, string>
}) {
  return (
    <aside className="rounded-[--radius-xl] border border-border-light bg-background-secondary/40 p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2
          className="text-[14px] font-medium tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Recent runs
        </h2>
        <span className="text-[11px] text-foreground-quaternary">
          {runs.length === 0 ? "none yet" : `last ${runs.length}`}
        </span>
      </header>

      {runs.length === 0 ? (
        <p className="px-2 py-6 text-center text-[13px] italic text-foreground-tertiary">
          Rule runs will show up here.
        </p>
      ) : (
        <ul className="space-y-2">
          {runs.map((r) => (
            <li
              key={r.id}
              className="rounded-[--radius-md] border border-border-light bg-surface px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    STATUS_STYLES[r.status]
                  )}
                >
                  {r.status}
                </span>
                <span className="text-[11px] text-foreground-quaternary">
                  {formatRelativeDate(r.ranAt)}
                </span>
              </div>
              <p className="mt-1.5 truncate text-[13px] text-foreground">
                {ruleNames[r.ruleId] ?? "(deleted rule)"}
              </p>
              {r.details && (
                <p className="mt-0.5 truncate text-[12px] text-foreground-tertiary">
                  {r.details}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
