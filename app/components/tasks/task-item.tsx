"use client"

import { cn } from "@/lib/utils"
import { toggleTask, deleteTask } from "@/lib/actions/tasks"
import { attachTaskToVault } from "@/lib/actions/vault"
import {
  Check,
  Trash2,
  Clock,
  AlertTriangle,
  BookOpen,
  AlertCircle,
} from "lucide-react"
import { useState, useTransition } from "react"

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

const priorityLabel: Record<string, { text: string; className: string }> = {
  high: { text: "High", className: "text-danger" },
  medium: { text: "Medium", className: "text-warning" },
  low: { text: "Low", className: "text-foreground-quaternary" },
}

export function TaskItem({ task, onClick }: TaskItemProps) {
  const [isPending, startTransition] = useTransition()
  const [isAttaching, startAttach] = useTransition()
  const [attachState, setAttachState] = useState<"idle" | "saved" | "error">(
    "idle"
  )
  const isDone = task.status === "done"
  const priority = priorityLabel[task.priority] ?? priorityLabel.medium

  function handleAttach(e: React.MouseEvent) {
    e.stopPropagation()
    startAttach(async () => {
      const result = await attachTaskToVault(task.id)
      setAttachState(result.ok ? "saved" : "error")
      setTimeout(() => setAttachState("idle"), 2500)
    })
  }

  // Due date metadata
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const isOverdue = !isDone && task.dueDate != null && task.dueDate < todayStr
  const isDueToday = !isDone && task.dueDate === todayStr
  const dueLabel = task.dueDate
    ? new Date(task.dueDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-[--radius-lg] border border-border-light bg-surface p-4",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface-raised hover:shadow-md",
        "active:translate-y-0",
        isPending && "pointer-events-none opacity-50"
      )}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => startTransition(() => toggleTask(task.id))}
        aria-label={isDone ? "Mark as incomplete" : "Mark as complete"}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          "transition-all duration-200",
          isDone
            ? "border-accent bg-accent"
            : "border-foreground-quaternary hover:border-accent hover:bg-accent/5"
        )}
      >
        {isDone && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              isDone && "text-foreground-tertiary line-through"
            )}
          >
            {task.title}
          </span>
        </div>

        {task.description && (
          <p
            className={cn(
              "mt-1 line-clamp-2 text-xs text-foreground-tertiary",
              isDone && "line-through"
            )}
          >
            {task.description}
          </p>
        )}

        {/* Meta row: priority + due date */}
        {(dueLabel || !isDone) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {!isDone && (
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  priority.className
                )}
              >
                {priority.text}
              </span>
            )}
            {dueLabel && !isDone && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  isOverdue
                    ? "font-medium text-danger"
                    : isDueToday
                      ? "font-medium text-warning"
                      : "text-foreground-tertiary"
                )}
              >
                {isOverdue ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {isOverdue ? "Overdue, " : isDueToday ? "Due today" : "Due "}
                {!isDueToday && dueLabel}
              </span>
            )}
            {dueLabel && isDone && (
              <span className="flex items-center gap-1 text-foreground-quaternary line-through">
                <Clock className="h-3 w-3" />
                {dueLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={handleAttach}
          disabled={isAttaching}
          aria-label="Save task to Obsidian"
          title={
            attachState === "saved"
              ? "Saved to today's daily note"
              : attachState === "error"
                ? "Vault error"
                : "Save to Obsidian"
          }
          className={cn(
            "rounded-[--radius-sm] p-1.5 transition-all duration-150",
            attachState === "saved"
              ? "text-success opacity-100"
              : attachState === "error"
                ? "text-danger opacity-100"
                : "text-foreground-quaternary opacity-0 hover:bg-accent-subtle hover:text-accent group-hover:opacity-100"
          )}
        >
          {attachState === "saved" ? (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          ) : attachState === "error" ? (
            <AlertCircle className="h-3.5 w-3.5" />
          ) : (
            <BookOpen className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => deleteTask(task.id))}
          aria-label="Delete task"
          className="rounded-[--radius-sm] p-1.5 text-foreground-quaternary opacity-0 transition-all duration-150 hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
