"use client"

import { cn } from "@/lib/utils"
import { toggleTask, deleteTask } from "@/lib/actions/tasks"
import { Check, Trash2, Clock, AlertTriangle } from "lucide-react"
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

const columns = [
  { key: "todo", label: "To Do", color: "border-foreground-quaternary" },
  { key: "in_progress", label: "In Progress", color: "border-accent" },
  { key: "done", label: "Done", color: "border-success" },
]

function KanbanCard({ task }: { task: Task }) {
  const [isPending, startTransition] = useTransition()
  const isDone = task.status === "done"

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const isOverdue = task.dueDate && task.dueDate < todayStr && !isDone
  const isDueToday = task.dueDate === todayStr && !isDone

  return (
    <div
      className={cn(
        "rounded-[--radius-lg] border border-border-light/60 bg-surface p-3.5 transition-all duration-200 hover:shadow-sm hover:border-accent/20",
        isPending && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div
            className={cn("h-2 w-2 rounded-full shrink-0", priorityColors[task.priority])}
            title={`${task.priority} priority`}
          />
          <span className={cn("text-sm font-medium", isDone && "line-through text-foreground-tertiary")}>
            {task.title}
          </span>
        </div>
        <button
          onClick={() => startTransition(() => deleteTask(task.id))}
          className="shrink-0 rounded p-1 text-foreground-quaternary opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-foreground-tertiary line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        {task.dueDate && (
          <div className="flex items-center gap-1">
            {isOverdue ? (
              <AlertTriangle className="h-2.5 w-2.5 text-danger" />
            ) : (
              <Clock className="h-2.5 w-2.5 text-foreground-quaternary" />
            )}
            <span
              className={cn(
                "text-[11px]",
                isOverdue ? "text-danger font-medium" : isDueToday ? "text-warning font-medium" : "text-foreground-quaternary"
              )}
            >
              {new Date(task.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        )}

        <button
          onClick={() => startTransition(() => toggleTask(task.id))}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
            isDone
              ? "border-success bg-success"
              : "border-foreground-quaternary hover:border-accent"
          )}
        >
          {isDone && <Check className="h-2.5 w-2.5 text-white" />}
        </button>
      </div>
    </div>
  )
}

export function KanbanView({ tasks }: { tasks: Task[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {columns.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.key)
        return (
          <div key={col.key} className="space-y-3">
            <div className={cn("flex items-center gap-2 border-b-2 pb-2", col.color)}>
              <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background-secondary px-1.5 text-[11px] font-medium text-foreground-tertiary">
                {columnTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {columnTasks.length === 0 ? (
                <p className="py-6 text-center text-xs text-foreground-quaternary">
                  No tasks
                </p>
              ) : (
                columnTasks.map((task) => (
                  <KanbanCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
