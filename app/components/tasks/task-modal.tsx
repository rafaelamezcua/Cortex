"use client"

import { updateTask, deleteTask } from "@/lib/actions/tasks"
import { Button } from "@/app/components/ui/button"
import { X, Trash2, Save } from "lucide-react"
import { useState, useTransition, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
}

interface TaskModalProps {
  task: Task
  onClose: () => void
}

export function TaskModal({ task, onClose }: TaskModalProps) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [priority, setPriority] = useState(task.priority)
  const [status, setStatus] = useState(task.status)
  const [dueDate, setDueDate] = useState(task.dueDate || "")
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")

  // Track changes
  useEffect(() => {
    const changed =
      title !== task.title ||
      description !== (task.description || "") ||
      priority !== task.priority ||
      status !== task.status ||
      dueDate !== (task.dueDate || "")
    setHasChanges(changed)
  }, [title, description, priority, status, dueDate, task])

  function save() {
    startTransition(async () => {
      setSaveStatus("Saving...")
      const formData = new FormData()
      formData.set("title", title)
      formData.set("description", description)
      formData.set("priority", priority)
      formData.set("dueDate", dueDate)
      formData.set("status", status)
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
              className="rounded-[--radius-sm] p-1.5 text-foreground-tertiary hover:bg-surface-hover hover:text-foreground transition-colors"
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
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
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
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
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

          {/* Due Date */}
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
              className="flex items-center gap-1.5 rounded-[--radius-md] px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
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
