"use client"

import { updateProjectTask, deleteProjectTask } from "@/lib/actions/projects"
import { Button } from "@/app/components/ui/button"
import { X, Trash2, Save, Calendar as CalendarIcon } from "lucide-react"
import { useState, useTransition, useEffect } from "react"
import { cn } from "@/lib/utils"

type ProjectTask = {
  id: string
  projectId: string
  title: string
  description: string | null
  status: string
  dueDate?: string | null
  calendarId?: string | null
}

interface CalendarInfo {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

interface ProjectTaskModalProps {
  task: ProjectTask
  projectColor: string
  onClose: () => void
}

export function ProjectTaskModal({ task, projectColor, onClose }: ProjectTaskModalProps) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [status, setStatus] = useState(task.status)
  const [dueDate, setDueDate] = useState(task.dueDate || "")
  const [calendarId, setCalendarId] = useState(task.calendarId || "")
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")

  useEffect(() => {
    fetch("/api/calendars")
      .then((r) => r.json())
      .then((data) => {
        if (data.calendars?.length) setCalendars(data.calendars)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const changed =
      title !== task.title ||
      description !== (task.description || "") ||
      status !== task.status ||
      dueDate !== (task.dueDate || "") ||
      calendarId !== (task.calendarId || "")
    setHasChanges(changed)
  }, [title, description, status, dueDate, calendarId, task])

  function save() {
    startTransition(async () => {
      setSaveStatus("Saving...")
      await updateProjectTask(task.id, {
        title,
        description,
        status: status as "todo" | "in_progress" | "done",
        dueDate,
        calendarId: calendarId || undefined,
      })
      setHasChanges(false)
      setSaveStatus("Saved")
      setTimeout(() => setSaveStatus(""), 2000)
    })
  }

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

  const statuses = [
    { value: "todo", label: "To Do", dot: "bg-foreground-quaternary" },
    { value: "in_progress", label: "In Progress", dot: "bg-accent" },
    { value: "done", label: "Done", dot: "bg-success" },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[--radius-2xl] border border-border-light bg-glass-surface-floating shadow-xl backdrop-blur-2xl"
      >
        {/* Color bar */}
        <div className="h-1.5" style={{ backgroundColor: projectColor }} />

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-light/40 bg-surface/90 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold tracking-tight">Edit Task</h2>
            {saveStatus && <span className="text-xs text-success">{saveStatus}</span>}
            {hasChanges && !saveStatus && <span className="text-xs text-warning">Unsaved</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {hasChanges && (
              <Button size="sm" onClick={save} disabled={isPending}>
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
            )}
            <button onClick={onClose} className="rounded-[--radius-sm] p-1.5 text-foreground-tertiary hover:bg-surface-hover hover:text-foreground transition-colors">
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

          {/* Status */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">Status</label>
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

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-10 w-full rounded-[--radius-md] border border-border-light bg-background px-3 text-sm text-foreground outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Calendar assignment */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
              Add to Calendar
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCalendarId("")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-150",
                  !calendarId
                    ? "border-accent bg-accent-light text-accent"
                    : "border-border text-foreground-tertiary hover:border-accent/30"
                )}
              >
                None
              </button>
              <button
                type="button"
                onClick={() => setCalendarId("local")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-150",
                  calendarId === "local"
                    ? "border-accent bg-accent-light text-accent"
                    : "border-border text-foreground-tertiary hover:border-accent/30"
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                Local
              </button>
              {calendars.map((cal) => (
                <button
                  type="button"
                  key={cal.id}
                  onClick={() => setCalendarId(cal.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-150",
                    calendarId === cal.id
                      ? "border-accent bg-accent-light text-accent"
                      : "border-border text-foreground-tertiary hover:border-accent/30"
                  )}
                >
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: cal.backgroundColor }}
                  />
                  {cal.summary}
                </button>
              ))}
            </div>
            {!dueDate && (
              <p className="text-[11px] text-foreground-quaternary">
                Set a due date to create a calendar event.
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={4}
              className="w-full resize-none rounded-[--radius-md] border border-border-light bg-background p-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-foreground-quaternary focus:border-accent transition-colors"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border-light/40">
            <button
              onClick={() => {
                if (!confirm("Delete this task?")) return
                startTransition(async () => {
                  await deleteProjectTask(task.id)
                  onClose()
                })
              }}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-[--radius-md] px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                {hasChanges ? "Discard" : "Close"}
              </Button>
              {hasChanges && (
                <Button size="sm" onClick={save} disabled={isPending} loading={isPending}>
                  Save
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
