"use client"

import { Card } from "@/app/components/ui/card"
import { WidgetHeader } from "@/app/components/ui/widget-header"
import { Skeleton } from "@/app/components/ui/skeleton"
import { GraduationCap, Clock, AlertTriangle, ExternalLink, Plus, Check } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { createTask, getTasks } from "@/lib/actions/tasks"

interface Assignment {
  id: number
  name: string
  due_at: string | null
  course_name: string
  html_url: string
  points_possible: number | null
  description?: string | null
}

type TaskRecord = Awaited<ReturnType<typeof getTasks>>[number]
type TurnState = "idle" | "pending" | "added" | "duplicate" | "error"

function toDateOnly(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function daysUntil(iso: string): number {
  const now = Date.now()
  const target = new Date(iso).getTime()
  return Math.round((target - now) / 86_400_000)
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function TurnIntoTaskButton({
  assignment,
  existingTitles,
  onAdded,
}: {
  assignment: Assignment
  existingTitles: Set<string>
  onAdded: (title: string) => void
}) {
  const initial: TurnState = existingTitles.has(assignment.name.toLowerCase())
    ? "duplicate"
    : "idle"
  const [state, setState] = useState<TurnState>(initial)

  useEffect(() => {
    if (state === "idle" && existingTitles.has(assignment.name.toLowerCase())) {
      setState("duplicate")
    }
  }, [existingTitles, assignment.name, state])

  async function handle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (state !== "idle") return

    setState("pending")

    const fd = new FormData()
    fd.set("title", assignment.name)
    fd.set("priority", "medium")
    if (assignment.due_at) {
      fd.set("dueDate", toDateOnly(assignment.due_at))
      // Only push to calendar when the due date is close enough that it
      // actually helps to see it on the day view. Two weeks is the window.
      const days = daysUntil(assignment.due_at)
      if (days >= 0 && days <= 14) {
        fd.set("addToCalendar", "true")
      }
    }

    const summary = assignment.description
      ? stripHtml(assignment.description).slice(0, 200)
      : ""
    const description = summary
      ? `${assignment.html_url}\n\n${summary}`
      : assignment.html_url
    fd.set("description", description)

    try {
      await createTask(fd)
      onAdded(assignment.name)
      setState("added")
      // Disable for 2s, then the duplicate-guard takes over so the button
      // stays locked until a fresh page load (or it's marked done).
      setTimeout(() => {
        setState((s) => (s === "added" ? "duplicate" : s))
      }, 2000)
    } catch {
      setState("error")
      setTimeout(() => setState("idle"), 2000)
    }
  }

  const label =
    state === "duplicate"
      ? "Already added"
      : state === "added"
        ? "Added"
        : state === "error"
          ? "Try again"
          : "Turn into task"

  const Icon = state === "added" || state === "duplicate" ? Check : Plus

  return (
    <button
      type="button"
      onClick={handle}
      disabled={state !== "idle"}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[--radius-sm] px-1.5 py-0.5 text-[11px] font-medium outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
        state === "idle" &&
          "text-foreground-tertiary hover:bg-surface-active hover:text-foreground",
        state === "pending" && "text-foreground-quaternary",
        (state === "added" || state === "duplicate") && "text-success",
        state === "error" && "text-danger"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  )
}

export function CanvasWidget({ isConnected }: { isConnected: boolean }) {
  const [assignments, setAssignments] = useState<Assignment[] | null>(null)
  const [error, setError] = useState(false)
  const [existingTitles, setExistingTitles] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isConnected) return

    fetch("/api/canvas")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => setAssignments(data.assignments))
      .catch(() => setError(true))
  }, [isConnected])

  useEffect(() => {
    if (!isConnected) return
    // Build initial set of active-task titles for de-dup. Server action is
    // callable from the client via the "use server" directive.
    getTasks()
      .then((tasks: TaskRecord[]) => {
        const active = tasks
          .filter((t) => t.status !== "done")
          .map((t) => t.title.toLowerCase())
        setExistingTitles(new Set(active))
      })
      .catch(() => {
        // Non-fatal; de-dup just won't pre-populate.
      })
  }, [isConnected])

  const handleAdded = (title: string) => {
    setExistingTitles((prev) => {
      const next = new Set(prev)
      next.add(title.toLowerCase())
      return next
    })
  }

  if (!isConnected) {
    return (
      <Card className="col-span-1">
        <WidgetHeader icon={GraduationCap} label="Canvas" />
        <p className="text-sm text-foreground-tertiary">
          Add CANVAS_API_URL and CANVAS_API_TOKEN to connect
        </p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="col-span-1">
        <WidgetHeader icon={GraduationCap} label="Canvas" />
        <p className="text-xs text-foreground-tertiary">Unable to fetch assignments</p>
      </Card>
    )
  }

  if (!assignments) {
    return (
      <Card className="col-span-1">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </Card>
    )
  }

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  return (
    <Card className="col-span-1">
      <WidgetHeader
        icon={GraduationCap}
        label="Canvas"
        subtitle={assignments.length > 0 ? `${assignments.length} upcoming` : undefined}
      />

      {assignments.length === 0 ? (
        <p className="text-sm text-foreground-tertiary">No upcoming assignments</p>
      ) : (
        <div className="space-y-2.5">
          {assignments.slice(0, 8).map((a) => {
            const dueDate = a.due_at ? new Date(a.due_at) : null
            const dueDateStr = dueDate
              ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`
              : null
            const isOverdue = dueDateStr ? dueDateStr < todayStr : false
            const isDueToday = dueDateStr === todayStr

            return (
              <div
                key={a.id}
                className="flex items-start gap-2.5 rounded-[--radius-md] p-1.5 -mx-1.5 transition-colors hover:bg-surface-hover group"
              >
                <a
                  href={a.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] rounded-[--radius-sm]"
                >
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                    {a.name}
                  </p>
                  <p className="text-xs text-foreground-quaternary truncate">
                    {a.course_name}
                  </p>
                  {dueDate && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {isOverdue ? (
                        <AlertTriangle className="h-2.5 w-2.5 text-danger" />
                      ) : (
                        <Clock className="h-2.5 w-2.5 text-foreground-quaternary" />
                      )}
                      <span
                        className={cn(
                          "text-xs",
                          isOverdue
                            ? "text-danger font-medium"
                            : isDueToday
                              ? "text-warning font-medium"
                              : "text-foreground-tertiary"
                        )}
                      >
                        {isOverdue ? "Overdue, " : isDueToday ? "Due today, " : ""}
                        {dueDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </a>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <TurnIntoTaskButton
                    assignment={a}
                    existingTitles={existingTitles}
                    onAdded={handleAdded}
                  />
                  <ExternalLink className="h-3 w-3 text-foreground-quaternary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
