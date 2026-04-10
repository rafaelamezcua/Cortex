"use client"

import { cn } from "@/lib/utils"
import { toggleTask, deleteTask } from "@/lib/actions/tasks"
import { Check, Trash2, Circle, AlertTriangle } from "lucide-react"
import { useTransition } from "react"

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  order: number
  createdAt: string
  updatedAt: string
}

const priorityColors: Record<string, string> = {
  low: "bg-foreground-quaternary",
  medium: "bg-warning",
  high: "bg-danger",
}

function TimelineItem({ task, isLast }: { task: Task; isLast: boolean }) {
  const [isPending, startTransition] = useTransition()
  const isDone = task.status === "done"

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const isOverdue = task.dueDate && task.dueDate < todayStr && !isDone
  const isDueToday = task.dueDate === todayStr && !isDone

  return (
    <div className={cn("flex gap-4", isPending && "opacity-50 pointer-events-none")}>
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => startTransition(() => toggleTask(task.id))}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 z-10 bg-background transition-all",
            isDone
              ? "border-success bg-success"
              : isOverdue
                ? "border-danger"
                : "border-foreground-quaternary hover:border-accent"
          )}
        >
          {isDone && <Check className="h-3 w-3 text-white" />}
        </button>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border-light min-h-[24px]" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className={cn(
                "text-sm font-medium",
                isDone && "line-through text-foreground-tertiary"
              )}
            >
              {task.title}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <div
                className={cn("h-1.5 w-1.5 rounded-full", priorityColors[task.priority])}
              />
              <span className="text-[11px] text-foreground-quaternary capitalize">
                {task.priority}
              </span>
              {task.dueDate && (
                <>
                  <span className="text-foreground-quaternary">·</span>
                  <span
                    className={cn(
                      "text-[11px]",
                      isOverdue
                        ? "text-danger font-medium"
                        : isDueToday
                          ? "text-warning font-medium"
                          : "text-foreground-quaternary"
                    )}
                  >
                    {isOverdue && "Overdue — "}
                    {isDueToday && "Today — "}
                    {new Date(task.dueDate + "T12:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </>
              )}
            </div>
            {task.description && (
              <p className="mt-1 text-xs text-foreground-tertiary line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <button
            onClick={() => startTransition(() => deleteTask(task.id))}
            className="shrink-0 rounded p-1 text-foreground-quaternary transition-all hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function TimelineView({ tasks }: { tasks: Task[] }) {
  // Group by date sections
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const overdue = tasks.filter(
    (t) => t.dueDate && t.dueDate < todayStr && t.status !== "done"
  )
  const dueToday = tasks.filter(
    (t) => t.dueDate === todayStr && t.status !== "done"
  )
  const upcoming = tasks.filter(
    (t) => t.dueDate && t.dueDate > todayStr && t.status !== "done"
  )
  const noDue = tasks.filter((t) => !t.dueDate && t.status !== "done")
  const done = tasks.filter((t) => t.status === "done")

  const sections = [
    { label: "Overdue", tasks: overdue, color: "text-danger" },
    { label: "Today", tasks: dueToday, color: "text-warning" },
    { label: "Upcoming", tasks: upcoming, color: "text-accent" },
    { label: "No Due Date", tasks: noDue, color: "text-foreground-tertiary" },
    { label: "Completed", tasks: done, color: "text-success" },
  ].filter((s) => s.tasks.length > 0)

  if (sections.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground-tertiary">
        No tasks yet. Add one above.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.label}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className={cn("text-xs font-semibold uppercase tracking-wider", section.color)}>
              {section.label}
            </h3>
            <span className="text-[11px] text-foreground-quaternary">
              {section.tasks.length}
            </span>
          </div>
          <div>
            {section.tasks.map((task, i) => (
              <TimelineItem
                key={task.id}
                task={task}
                isLast={i === section.tasks.length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
