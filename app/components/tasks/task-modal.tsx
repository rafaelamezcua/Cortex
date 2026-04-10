"use client"

import { updateTask, deleteTask } from "@/lib/actions/tasks"
import { Button } from "@/app/components/ui/button"
import { X, Trash2 } from "lucide-react"
import { useState, useTransition, useCallback, useRef } from "react"

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
  const [notes, setNotes] = useState("")
  const [saveStatus, setSaveStatus] = useState("")
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const autoSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus("Saving...")
    saveTimer.current = setTimeout(() => {
      startTransition(async () => {
        const formData = new FormData()
        formData.set("title", title)
        formData.set("description", description)
        formData.set("priority", priority)
        formData.set("dueDate", dueDate)
        await updateTask(task.id, formData)
        setSaveStatus("Saved")
        setTimeout(() => setSaveStatus(""), 2000)
      })
    }, 500)
  }, [title, description, priority, dueDate, task.id])

  function handleDelete() {
    startTransition(async () => {
      await deleteTask(task.id)
      onClose()
    })
  }

  const priorities = [
    { value: "low", label: "Low", color: "bg-foreground-quaternary" },
    { value: "medium", label: "Medium", color: "bg-warning" },
    { value: "high", label: "High", color: "bg-danger" },
  ]

  const statuses = [
    { value: "todo", label: "To Do" },
    { value: "in_progress", label: "In Progress" },
    { value: "done", label: "Done" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[--radius-xl] border border-border-light/40 bg-surface/95 backdrop-blur-2xl p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Edit Task</h2>
            {saveStatus && (
              <span className="text-xs text-foreground-quaternary">{saveStatus}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-[--radius-sm] p-1.5 text-foreground-tertiary hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              autoSave()
            }}
            className="w-full bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-foreground-quaternary"
            placeholder="Task name"
          />

          {/* Status */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
              Status
            </label>
            <div className="flex gap-2">
              {statuses.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setStatus(s.value)
                    // Update status directly
                    startTransition(async () => {
                      const formData = new FormData()
                      formData.set("title", title)
                      formData.set("description", description)
                      formData.set("priority", priority)
                      formData.set("dueDate", dueDate)
                      formData.set("status", s.value)
                      await updateTask(task.id, formData)
                    })
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                    status === s.value
                      ? "border-accent bg-accent-light text-accent"
                      : "border-border text-foreground-secondary hover:border-accent/30"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
              Priority
            </label>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setPriority(p.value)
                    autoSave()
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                    priority === p.value
                      ? "border-accent bg-accent-light text-accent"
                      : "border-border text-foreground-secondary hover:border-accent/30"
                  }`}
                >
                  <div className={`h-2 w-2 rounded-full ${p.color}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value)
                autoSave()
              }}
              className="h-10 w-full rounded-[--radius-md] border border-border-light bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                autoSave()
              }}
              placeholder="Add details..."
              rows={3}
              className="w-full resize-none rounded-[--radius-md] border border-border-light bg-background p-3 text-sm text-foreground outline-none placeholder:text-foreground-quaternary focus:border-accent"
            />
          </div>

          {/* Notes / Updates */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
              Notes & Updates
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note or update..."
              rows={4}
              className="w-full resize-none rounded-[--radius-md] border border-border-light bg-background p-3 text-sm text-foreground outline-none placeholder:text-foreground-quaternary focus:border-accent"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
