"use client"

import {
  updateTask,
  deleteTask,
  addSubtask,
  toggleTask,
} from "@/lib/actions/tasks"
import { Button } from "@/app/components/ui/button"
import { X, Trash2, Save, Plus, Check, Repeat } from "lucide-react"
import { useState, useTransition, useEffect } from "react"
import { cn } from "@/lib/utils"

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  recurrence?: string | null
}

type Subtask = {
  id: string
  title: string
  status: string
  priority: string
}

interface TaskModalProps {
  task: Task
  subtasks?: Subtask[]
  onClose: () => void
}

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
]

export function TaskModal({ task, subtasks = [], onClose }: TaskModalProps) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [priority, setPriority] = useState(task.priority)
  const [status, setStatus] = useState(task.status)
  const [dueDate, setDueDate] = useState(task.dueDate || "")
  const [recurrence, setRecurrence] = useState<string>(task.recurrence || "none")
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")
  const [newSubtask, setNewSubtask] = useState("")

  // Track changes
  useEffect(() => {
    const changed =
      title !== task.title ||
      description !== (task.description || "") ||
      priority !== task.priority ||
      status !== task.status ||
      dueDate !== (task.dueDate || "") ||
      recurrence !== (task.recurrence || "none")
    setHasChanges(changed)
  }, [title, description, priority, status, dueDate, recurrence, task])

  function save() {
    startTransition(async () => {
      setSaveStatus("Saving...")
      const formData = new FormData()
      formData.set("title", title)
      formData.set("description", description)
      formData.set("priority", priority)
      formData.set("dueDate", dueDate)
      formData.set("status", status)
      formData.set("recurrence", recurrence)
      await updateTask(task.id, formData)
      setHasChanges(false)
      setSaveStatus("Saved")
      setTimeout(() => setSaveStatus(""), 2000)
    })
  }

  function handleDelete() {
    if (!confirm("Delete this task?")) return
    startTransition(async () => {
      await deleteTask(task.id)
      onClose()
    })
  }

  function submitSubtask() {
    const trimmed = newSubtask.trim()
    if (!trimmed) return
    startTransition(async () => {
      await addSubtask(task.id, trimmed)
      setNewSubtask("")
    })
  }

  // Save on Ctrl+S
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        if (hasChanges) save()
      }
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  })

  const priorities = [
    { value: "low", label: "Low", dot: "bg-foreground-quaternary" },
    { value: "medium", label: "Medium", dot: "bg-warning" },
    { value: "high", label: "High", dot: "bg-danger" },
  ]

  const statuses = [
    { value: "todo", label: "To Do", dot: "bg-foreground-quaternary" },
    { value: "in_progress", label: "In Progress", dot: "bg-accent" },
    { value: "done", label: "Done", dot: "bg-success" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[--radius-xl] border border-border-light/40 bg-surface/95 backdrop-blur-2xl shadow-lg">
        {/* Header bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-light/40 bg-surface/90 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold tracking-tight">Edit Task</h2>
            {saveStatus && (
              <span className="text-xs text-success">{saveStatus}</span>
            )}
            {hasChanges && !saveStatus && (
              <span className="text-xs text-warning">Unsaved changes</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {hasChanges && (
              <Button size="sm" onClick={save} disabled={isPending}>
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
            )}
            <button
              onClick={onClose}
              className="rounded-[--radius-sm] p-1.5 text-foreground-tertiary hover:bg-surface-hover hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-xl font-bold text-foreground outline-none placeholder:text-foreground-quaternary"
            placeholder="Task name"
          />

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(s.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                      status === s.value
                        ? "border-accent bg-accent-light text-accent"
                        : "border-border text-foreground-tertiary hover:border-accent/30"
                    )}
                  >
                    <div className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                Priority
              </label>
              <div className="flex flex-wrap gap-1.5">
                {priorities.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                      priority === p.value
                        ? "border-accent bg-accent-light text-accent"
                        : "border-border text-foreground-tertiary hover:border-accent/30"
                    )}
                  >
                    <div className={cn("h-1.5 w-1.5 rounded-full", p.dot)} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Due Date + Recurrence */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 w-full rounded-[--radius-md] border border-border-light bg-background px-3 text-sm text-foreground outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                <Repeat className="h-3 w-3" />
                Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="h-10 w-full rounded-[--radius-md] border border-border-light bg-background px-3 text-sm text-foreground outline-none focus:border-accent transition-colors"
              >
                {RECURRENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
              Subtasks ({subtasks.filter((s) => s.status === "done").length} /{" "}
              {subtasks.length})
            </label>
            <ul className="space-y-1">
              {subtasks.map((sub) => (
                <SubtaskRow key={sub.id} subtask={sub} />
              ))}
            </ul>
            <div className="flex items-center gap-2 rounded-[--radius-md] border border-dashed border-border px-3 py-2 focus-within:border-accent/60 transition-colors">
              <Plus className="h-3.5 w-3.5 text-foreground-quaternary" />
              <input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    submitSubtask()
                  }
                }}
                placeholder="Add a subtask"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-quaternary"
              />
              {newSubtask.trim() && (
                <button
                  type="button"
                  onClick={submitSubtask}
                  disabled={isPending}
                  className="rounded-[--radius-sm] bg-accent px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40"
                >
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done..."
              rows={4}
              className="w-full resize-none rounded-[--radius-md] border border-border-light bg-background p-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-foreground-quaternary focus:border-accent transition-colors"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border-light/40">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-[--radius-md] px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete task
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                {hasChanges ? "Discard" : "Close"}
              </Button>
              {hasChanges && (
                <Button size="sm" onClick={save} disabled={isPending} loading={isPending}>
                  Save changes
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubtaskRow({ subtask }: { subtask: Subtask }) {
  const [isPending, startTransition] = useTransition()
  const isDone = subtask.status === "done"
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-[--radius-sm] px-2 py-1.5 transition-colors hover:bg-surface-hover",
        isPending && "pointer-events-none opacity-60"
      )}
    >
      <button
        type="button"
        onClick={() => startTransition(() => toggleTask(subtask.id))}
        aria-label={isDone ? "Mark subtask incomplete" : "Mark subtask complete"}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          isDone
            ? "border-accent bg-accent"
            : "border-foreground-quaternary hover:border-accent hover:bg-accent/5"
        )}
      >
        {isDone && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </button>
      <span
        className={cn(
          "flex-1 text-sm",
          isDone ? "text-foreground-tertiary line-through" : "text-foreground"
        )}
      >
        {subtask.title}
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => deleteTask(subtask.id))}
        aria-label="Delete subtask"
        className="rounded-[--radius-sm] p-1 text-foreground-quaternary transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </li>
  )
}
