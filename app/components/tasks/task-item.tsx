"use client"

import { cn } from "@/lib/utils"
import {
  toggleTask,
  deleteTask,
  addSubtask,
  saveTaskAsTemplate,
} from "@/lib/actions/tasks"
import { attachTaskToVault } from "@/lib/actions/vault"
import {
  Check,
  Trash2,
  Clock,
  AlertTriangle,
  BookOpen,
  AlertCircle,
  Repeat,
  ChevronDown,
  ChevronRight,
  Plus,
  BookmarkPlus,
} from "lucide-react"
import { useState, useTransition } from "react"

type Subtask = {
  id: string
  title: string
  status: string
  priority: string
}

interface TaskItemProps {
  task: {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    dueDate: string | null
    recurrence?: string | null
  }
  subtasks?: Subtask[]
  onClick?: () => void
}

const priorityLabel: Record<string, { text: string; className: string }> = {
  high: { text: "High", className: "text-danger" },
  medium: { text: "Medium", className: "text-warning" },
  low: { text: "Low", className: "text-foreground-quaternary" },
}

export function TaskItem({ task, subtasks = [], onClick }: TaskItemProps) {
  const [isPending, startTransition] = useTransition()
  const [isAttaching, startAttach] = useTransition()
  const [attachState, setAttachState] = useState<"idle" | "saved" | "error">(
    "idle"
  )
  const [expanded, setExpanded] = useState(false)
  const [newSubtask, setNewSubtask] = useState("")
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)
  const isDone = task.status === "done"
  const priority = priorityLabel[task.priority] ?? priorityLabel.medium
  const hasChildren = subtasks.length > 0
  const hasRecurrence =
    !!task.recurrence && task.recurrence !== "none" && task.recurrence !== null
  const doneChildren = subtasks.filter((s) => s.status === "done").length

  function handleAttach(e: React.MouseEvent) {
    e.stopPropagation()
    startAttach(async () => {
      const result = await attachTaskToVault(task.id)
      setAttachState(result.ok ? "saved" : "error")
      setTimeout(() => setAttachState("idle"), 2500)
    })
  }

  function submitSubtask() {
    const title = newSubtask.trim()
    if (!title) {
      setShowSubtaskInput(false)
      return
    }
    startTransition(async () => {
      await addSubtask(task.id, title)
      setNewSubtask("")
      setShowSubtaskInput(false)
      setExpanded(true)
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
        "group rounded-[--radius-lg] border border-border-light bg-surface",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface-raised hover:shadow-md",
        "active:translate-y-0",
        isPending && "pointer-events-none opacity-50"
      )}
    >
      <div className="flex items-start gap-3 p-4">
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
            {hasRecurrence && (
              <span
                title={`Repeats ${task.recurrence}`}
                aria-label={`Repeats ${task.recurrence}`}
                className="inline-flex items-center text-accent/70"
              >
                <Repeat className="h-3 w-3" />
              </span>
            )}
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

          {/* Meta row: priority + due date + subtask progress */}
          {(dueLabel || !isDone || hasChildren) && (
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
              {hasChildren && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpanded((v) => !v)
                  }}
                  className="flex items-center gap-1 rounded-[--radius-sm] px-1.5 py-0.5 text-[11px] font-medium text-foreground-tertiary hover:bg-surface-hover hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {doneChildren} / {subtasks.length} subtasks
                </button>
              )}
            </div>
          )}
        </div>

        {/* Hover actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              startTransition(() => saveTaskAsTemplate(task.id))
            }}
            aria-label="Save as template"
            title="Save as template"
            className="rounded-[--radius-sm] p-1.5 text-foreground-quaternary opacity-0 transition-all duration-150 hover:bg-accent-subtle hover:text-accent group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:opacity-100"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
          </button>
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
                  : "text-foreground-quaternary opacity-0 hover:bg-accent-subtle hover:text-accent group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:opacity-100"
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
            onClick={(e) => {
              e.stopPropagation()
              startTransition(() => deleteTask(task.id))
            }}
            aria-label="Delete task"
            className="rounded-[--radius-sm] p-1.5 text-foreground-quaternary opacity-0 transition-all duration-150 hover:bg-danger/10 hover:text-danger group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Subtask tree */}
      {(expanded || showSubtaskInput) && (
        <div className="border-t border-border-light/40 px-4 py-2">
          {expanded && hasChildren && (
            <ul className="space-y-1 pb-1">
              {subtasks.map((sub) => (
                <SubtaskRow key={sub.id} subtask={sub} />
              ))}
            </ul>
          )}
          {showSubtaskInput ? (
            <div className="flex items-center gap-2 py-1">
              <div className="h-4 w-4 shrink-0 rounded-full border-2 border-foreground-quaternary" />
              <input
                autoFocus
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    submitSubtask()
                  }
                  if (e.key === "Escape") {
                    setShowSubtaskInput(false)
                    setNewSubtask("")
                  }
                }}
                onBlur={submitSubtask}
                placeholder="Subtask"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-quaternary"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setExpanded(true)
                setShowSubtaskInput(true)
              }}
              className="flex w-full items-center gap-2 rounded-[--radius-sm] px-1 py-1 text-xs text-foreground-tertiary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add subtask
            </button>
          )}
        </div>
      )}

      {/* "Add subtask" affordance when collapsed and no children */}
      {!expanded && !showSubtaskInput && !hasChildren && (
        <div className="flex justify-start border-t border-border-light/0 px-4 pb-2">
          <button
            type="button"
            onClick={() => {
              setShowSubtaskInput(true)
              setExpanded(true)
            }}
            className="flex items-center gap-1 rounded-[--radius-sm] px-1 py-0.5 text-[11px] text-foreground-quaternary opacity-0 transition-all duration-150 hover:text-accent group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:opacity-100"
          >
            <Plus className="h-3 w-3" />
            Add subtask
          </button>
        </div>
      )}
    </div>
  )
}

function SubtaskRow({ subtask }: { subtask: Subtask }) {
  const [isPending, startTransition] = useTransition()
  const isDone = subtask.status === "done"

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-[--radius-sm] px-1 py-1 transition-colors hover:bg-surface-hover",
        isPending && "pointer-events-none opacity-60"
      )}
    >
      <button
        type="button"
        onClick={() => startTransition(() => toggleTask(subtask.id))}
        aria-label={isDone ? "Mark subtask incomplete" : "Mark subtask complete"}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150",
          isDone
            ? "border-accent bg-accent"
            : "border-foreground-quaternary hover:border-accent hover:bg-accent/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        )}
      >
        {isDone && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </button>
      <span
        className={cn(
          "flex-1 text-xs transition-colors",
          isDone
            ? "text-foreground-tertiary line-through"
            : "text-foreground-secondary"
        )}
      >
        {subtask.title}
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => deleteTask(subtask.id))}
        aria-label="Delete subtask"
        className="rounded-[--radius-sm] p-1 text-foreground-quaternary opacity-0 transition-colors duration-150 hover:bg-danger/10 hover:text-danger group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </li>
  )
}

