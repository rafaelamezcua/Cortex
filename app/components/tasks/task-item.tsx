"use client"

import { cn } from "@/lib/utils"
import { toggleTask, deleteTask } from "@/lib/actions/tasks"
import { Check, Trash2 } from "lucide-react"
import { useTransition } from "react"

interface TaskItemProps {
  task: {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    dueDate: string | null
  }
  onClick?: () => void
}

const priorityColors: Record<string, string> = {
  low: "bg-foreground-quaternary",
  medium: "bg-warning",
  high: "bg-danger",
}

export function TaskItem({ task, onClick }: TaskItemProps) {
  const [isPending, startTransition] = useTransition()
  const isDone = task.status === "done"

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-[--radius-lg] border border-border-light/60 bg-surface p-4 transition-all duration-200",
        "hover:shadow-sm hover:border-accent/20",
        isPending && "opacity-50 pointer-events-none"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => startTransition(() => toggleTask(task.id))}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
          isDone
            ? "border-accent bg-accent"
            : "border-foreground-quaternary hover:border-accent hover:bg-accent/5"
        )}
        aria-label={isDone ? "Mark as incomplete" : "Mark as complete"}
      >
        {isDone && <Check className="h-3 w-3 text-white" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              isDone && "line-through text-foreground-tertiary"
            )}
          >
            {task.title}
          </span>
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0",
              priorityColors[task.priority]
            )}
            title={`${task.priority} priority`}
          />
        </div>
        {task.description && (
          <p
            className={cn(
              "mt-1 text-xs text-foreground-tertiary line-clamp-2",
              isDone && "line-through"
            )}
          >
            {task.description}
          </p>
        )}
        {task.dueDate && !isDone && (() => {
          const today = new Date()
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
          const isOverdue = task.dueDate < todayStr
          const isDueToday = task.dueDate === todayStr
          return (
            <p className={cn(
              "mt-1.5 text-xs",
              isOverdue ? "text-danger font-medium" : isDueToday ? "text-warning font-medium" : "text-foreground-quaternary"
            )}>
              {isOverdue ? "Overdue — " : isDueToday ? "Due today — " : "Due "}
              {new Date(task.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )
        })()}
        {task.dueDate && isDone && (
          <p className="mt-1.5 text-xs text-foreground-quaternary line-through">
            Due {new Date(task.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => startTransition(() => deleteTask(task.id))}
        className="shrink-0 rounded-[--radius-sm] p-1.5 text-foreground-quaternary opacity-0 transition-all duration-200 hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
        aria-label="Delete task"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
