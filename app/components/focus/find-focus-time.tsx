"use client"

import { cn } from "@/lib/utils"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar as CalendarIcon, Play, Loader2 } from "lucide-react"
import { createEvent } from "@/lib/actions/calendar"
import type { FocusBlock } from "@/lib/actions/focus"

type TaskOption = {
  id: string
  title: string
  status: "todo" | "in_progress" | "done"
}

type BlockState =
  | { kind: "idle" }
  | { kind: "selected" }
  | { kind: "blocking" }
  | { kind: "blocked" }
  | { kind: "error"; message: string }

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function tomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function isTodayISO(iso: string): boolean {
  const now = new Date()
  const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
  return iso === today
}

// "9:00 am"
function formatClock(localIso: string): string {
  // localIso is "YYYY-MM-DDTHH:mm" — parse the time part directly to avoid TZ drift.
  const t = localIso.split("T")[1] || "00:00"
  const [hStr, mStr] = t.split(":")
  const h = Number(hStr)
  const mm = mStr ?? "00"
  const period = h >= 12 ? "pm" : "am"
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${mm} ${period}`
}

function startsWithin15Min(localIso: string): boolean {
  // Block is "now-ish" if its start is between (now - 5m) and (now + 15m).
  const [datePart, timePart] = localIso.split("T")
  if (!datePart || !timePart) return false
  const [y, m, d] = datePart.split("-").map(Number)
  const [hh, mm] = timePart.split(":").map(Number)
  if (!y || !m || !d) return false
  const startMs = new Date(y, m - 1, d, hh, mm, 0, 0).getTime()
  const nowMs = Date.now()
  const diffMin = (startMs - nowMs) / 60000
  return diffMin >= -5 && diffMin <= 15
}

export function FindFocusTime({ tasks }: { tasks: TaskOption[] }) {
  const router = useRouter()

  const [date, setDate] = useState<string>(() => tomorrowISO())
  const [minMinutes, setMinMinutes] = useState<number>(90)
  const [taskId, setTaskId] = useState<string>("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<FocusBlock[]>([])

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [states, setStates] = useState<Record<number, BlockState>>({})

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== "done"),
    [tasks]
  )

  const fetchBlocks = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelectedIdx(null)
    setStates({})
    try {
      const params = new URLSearchParams({
        date,
        minMinutes: String(minMinutes),
      })
      const res = await fetch(`/api/focus/blocks?${params.toString()}`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error("Request failed")
      const data = (await res.json()) as { blocks?: FocusBlock[] }
      setBlocks(data.blocks ?? [])
    } catch {
      setError("Could not load focus blocks.")
      setBlocks([])
    } finally {
      setLoading(false)
    }
  }, [date, minMinutes])

  useEffect(() => {
    void fetchBlocks()
  }, [fetchBlocks])

  const selectedTaskTitle = useMemo(() => {
    const t = activeTasks.find((x) => x.id === taskId)
    return t?.title || "Deep work"
  }, [activeTasks, taskId])

  const handleBlockOnCalendar = useCallback(
    async (idx: number, block: FocusBlock) => {
      setStates((prev) => ({ ...prev, [idx]: { kind: "blocking" } }))
      try {
        const fd = new FormData()
        fd.set("title", `Focus: ${selectedTaskTitle}`)
        fd.set("startTime", block.start)
        fd.set("endTime", block.end)
        fd.set("recurrence", "none")
        await createEvent(fd)
        setStates((prev) => ({ ...prev, [idx]: { kind: "blocked" } }))
      } catch {
        setStates((prev) => ({
          ...prev,
          [idx]: { kind: "error", message: "Could not block. Try again." },
        }))
      }
    },
    [selectedTaskTitle]
  )

  const handleStartNow = useCallback(
    (block: FocusBlock) => {
      const durationSeconds = block.minutes * 60
      // Emit event for any in-page listener (future enhancement: focus-timer picks this up).
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(
            new CustomEvent("luma:start-focus", {
              detail: { taskId: taskId || null, durationSeconds },
            })
          )
        } catch {
          // Ignore — non-critical.
        }
      }
      // Deferral: focus-timer.tsx is owned by another agent this session, so we
      // simply route to /focus with the task preselected. The timer reading the
      // query param can be added as a follow-up.
      const href = taskId ? `/focus?task=${encodeURIComponent(taskId)}` : "/focus"
      router.push(href)
    },
    [router, taskId]
  )

  const isEmpty = !loading && !error && blocks.length === 0

  return (
    <section
      aria-labelledby="find-focus-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex items-baseline justify-between">
        <h2
          id="find-focus-heading"
          className="text-sm font-semibold uppercase tracking-wider text-foreground-tertiary"
        >
          Find focus time
        </h2>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <LabelledField label="Day" htmlFor="fft-date">
          <input
            id="fft-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn(
              "h-10 w-full rounded-[--radius-md] border border-border bg-surface px-3 text-sm text-foreground",
              "outline-none transition-colors duration-150 ease-out",
              "hover:border-accent/40",
              "focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          />
        </LabelledField>

        <LabelledField label="Block length" htmlFor="fft-minutes">
          <select
            id="fft-minutes"
            value={minMinutes}
            onChange={(e) => setMinMinutes(Number(e.target.value))}
            className={cn(
              "h-10 w-full rounded-[--radius-md] border border-border bg-surface px-3 text-sm text-foreground",
              "outline-none transition-colors duration-150 ease-out",
              "hover:border-accent/40",
              "focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <option value={60}>60 min</option>
            <option value={90}>90 min</option>
            <option value={120}>120 min</option>
          </select>
        </LabelledField>

        <LabelledField label="For task" htmlFor="fft-task">
          <select
            id="fft-task"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            className={cn(
              "h-10 w-full rounded-[--radius-md] border border-border bg-surface px-3 text-sm text-foreground",
              "outline-none transition-colors duration-150 ease-out",
              "hover:border-accent/40",
              "focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <option value="">Deep work (no task)</option>
            {activeTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </LabelledField>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-2">
        {loading && (
          <div className="flex items-center gap-2 rounded-[--radius-md] border border-border-light bg-surface/50 px-3.5 py-3 text-[13px] text-foreground-tertiary">
            <Loader2
              className="h-3.5 w-3.5 animate-spin"
              aria-hidden="true"
            />
            <span>Scanning your day...</span>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-[--radius-md] border border-border-light bg-surface px-3.5 py-3 text-[13px] text-foreground-secondary">
            {error}
          </div>
        )}

        {isEmpty && (
          <div className="rounded-[--radius-lg] border border-dashed border-border bg-surface/50 p-6 text-center">
            <p className="text-[14px] leading-relaxed text-foreground-secondary">
              {isTodayISO(date)
                ? "Today looks packed. Try a different day or shorter block."
                : "Tomorrow looks packed. Try a different day or shorter block."}
            </p>
          </div>
        )}

        {!loading && !error && blocks.length > 0 && (
          <ul className="flex flex-col gap-2">
            {blocks.map((b, idx) => {
              const state = states[idx] ?? { kind: "idle" }
              const isSelected = selectedIdx === idx
              const isBlocked = state.kind === "blocked"
              const isBlocking = state.kind === "blocking"
              const isErr = state.kind === "error"
              const canStartNow =
                isTodayISO(b.start.split("T")[0]) && startsWithin15Min(b.start)

              return (
                <li key={`${b.start}-${b.end}`} className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIdx(isSelected ? null : idx)
                    }
                    aria-expanded={isSelected}
                    disabled={isBlocked}
                    className={cn(
                      "group flex w-full items-center justify-between gap-3 rounded-[--radius-md] border px-3.5 py-3 text-left",
                      "transition-[transform,opacity,border-color,background-color] duration-150 ease-out",
                      "hover:border-accent/40 active:scale-[0.995]",
                      "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isBlocked
                        ? "border-border-light bg-surface/60 opacity-75"
                        : isSelected
                          ? "border-accent/60 bg-accent-subtle"
                          : "border-border-light bg-surface"
                    )}
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="text-[14px] text-foreground">
                        {formatClock(b.start)}
                      </span>
                      <span className="text-foreground-quaternary">
                        &rarr;
                      </span>
                      <span className="text-[14px] text-foreground">
                        {formatClock(b.end)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-foreground-tertiary">
                      <span className="mx-1 text-foreground-quaternary">
                        &middot;
                      </span>
                      {b.minutes} min
                      {isBlocked && (
                        <span className="ml-2 rounded-[--radius-full] border border-success/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                          Blocked
                        </span>
                      )}
                    </span>
                  </button>

                  {isSelected && !isBlocked && (
                    <div className="flex flex-wrap items-center gap-2 pl-1">
                      <button
                        type="button"
                        onClick={() => handleBlockOnCalendar(idx, b)}
                        disabled={isBlocking}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-[--radius-md] border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-foreground",
                          "transition-[transform,background-color,border-color] duration-150 ease-out",
                          "hover:border-accent/40 hover:bg-surface-hover active:scale-[0.98]",
                          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          isBlocking && "opacity-70"
                        )}
                      >
                        {isBlocking ? (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <CalendarIcon
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        )}
                        Block on calendar
                      </button>

                      {canStartNow && (
                        <button
                          type="button"
                          onClick={() => handleStartNow(b)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-[--radius-md] bg-accent px-3 py-1.5 text-[12px] font-medium text-white shadow-sm",
                            "transition-[transform,background-color] duration-150 ease-out",
                            "hover:bg-accent-hover active:scale-[0.98]",
                            "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          )}
                        >
                          <Play
                            className="h-3.5 w-3.5"
                            fill="currentColor"
                            aria-hidden="true"
                          />
                          Start now
                        </button>
                      )}

                      {isErr && (
                        <span className="text-[12px] text-danger">
                          {state.message}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function LabelledField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-wider text-foreground-tertiary"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
