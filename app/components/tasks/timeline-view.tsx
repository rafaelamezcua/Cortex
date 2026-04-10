"use client"

import { cn } from "@/lib/utils"
import { toggleTask, deleteTask } from "@/lib/actions/tasks"
import { Check, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { TaskModal } from "./task-modal"

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

const priorityBorder: Record<string, string> = {
  low: "border-l-foreground-quaternary",
  medium: "border-l-warning",
  high: "border-l-danger",
}

export function TimelineView({ tasks }: { tasks: Task[] }) {
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  // Build date buckets for the next 14 days + overdue + no date
  const dates: { key: string; label: string; isToday: boolean; isPast: boolean }[] = []

  // Overdue bucket
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && t.dueDate < todayStr && t.status !== "done"
  )

  // Next 14 days
  for (let i = 0; i < 14; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    dates.push({ key, label, isToday: i === 0, isPast: false })
  }

  const noDueTasks = tasks.filter((t) => !t.dueDate && t.status !== "done")
  const doneTasks = tasks.filter((t) => t.status === "done")

  return (
    <div className="space-y-1">
      {/* Overdue section */}
      {overdueTasks.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-danger" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-danger">
              Overdue ({overdueTasks.length})
            </h3>
            <div className="flex-1 h-px bg-danger/20" />
          </div>
          <div className="ml-6 space-y-1.5">
            {overdueTasks.map((task) => (
              <TimelineCard key={task.id} task={task} onClick={() => setEditingTask(task)} />
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[5px] top-0 bottom-0 w-px bg-border" />

        {dates.map((date) => {
          const dayTasks = tasks.filter(
            (t) => t.dueDate === date.key && t.status !== "done"
          )

          return (
            <div key={date.key} className="relative flex gap-4 mb-1">
              {/* Dot on timeline */}
              <div className="relative z-10 mt-2.5">
                <div
                  className={cn(
                    "h-[11px] w-[11px] rounded-full border-2",
                    date.isToday
                      ? "border-accent bg-accent"
                      : dayTasks.length > 0
                        ? "border-accent bg-background"
                        : "border-border bg-background"
                  )}
                />
              </div>

              {/* Date + tasks */}
              <div className="flex-1 pb-3">
                <p
                  className={cn(
                    "text-xs font-semibold mb-1.5",
                    date.isToday ? "text-accent" : "text-foreground-tertiary"
                  )}
                >
                  {date.label}
                </p>
                {dayTasks.length > 0 ? (
                  <div className="space-y-1.5">
                    {dayTasks.map((task) => (
                      <TimelineCard key={task.id} task={task} onClick={() => setEditingTask(task)} />
                    ))}
                  </div>
                ) : (
                  <div className="h-1" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* No due date */}
      {noDueTasks.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-foreground-quaternary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
              No due date ({noDueTasks.length})
            </h3>
            <div className="flex-1 h-px bg-border-light" />
          </div>
          <div className="ml-6 space-y-1.5">
            {noDueTasks.map((task) => (
              <TimelineCard key={task.id} task={task} onClick={() => setEditingTask(task)} />
            ))}
          </div>
        </div>
      )}

      {/* Done */}
      {doneTasks.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-success" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-success">
              Completed ({doneTasks.length})
            </h3>
            <div className="flex-1 h-px bg-success/20" />
          </div>
          <div className="ml-6 space-y-1.5">
            {doneTasks.slice(0, 5).map((task) => (
              <TimelineCard key={task.id} task={task} onClick={() => setEditingTask(task)} />
            ))}
            {doneTasks.length > 5 && (
              <p className="text-xs text-foreground-quaternary ml-1">
                +{doneTasks.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {editingTask && (
        <TaskModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  )
}

function TimelineCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const [isPending, startTransition] = useTransition()
  const isDone = task.status === "done"

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[--radius-md] border border-border-light/60 bg-surface px-3 py-2.5 border-l-[3px] cursor-pointer transition-all duration-200 hover:shadow-sm hover:border-accent/20",
        priorityBorder[task.priority],
        isPending && "opacity-50"
      )}
      onClick={onClick}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          startTransition(() => toggleTask(task.id))
        }}
        className={cn(
          "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          isDone ? "border-success bg-success" : "border-foreground-quaternary hover:border-accent"
        )}
      >
        {isDone && <Check className="h-2.5 w-2.5 text-white" />}
      </button>
      <span className={cn("text-sm font-medium flex-1 truncate", isDone && "line-through text-foreground-tertiary")}>
        {task.title}
      </span>
    </div>
  )
}
