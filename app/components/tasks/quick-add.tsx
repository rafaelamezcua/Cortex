"use client"

import { useRef, useState, useTransition } from "react"
import { Sparkles, Loader2, X } from "lucide-react"
import { parseTaskInput, type ParsedTask } from "@/lib/ai/parse-task"
import { createTask } from "@/lib/actions/tasks"

type Toast =
  | { kind: "success"; summary: string }
  | { kind: "error"; message: string }

function formatPreview(task: ParsedTask): string {
  const whenParts: string[] = []
  if (task.dueDate) {
    const d = new Date(task.dueDate + "T12:00:00")
    whenParts.push(
      d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    )
  }
  if (task.dueTime) {
    const [h, m] = task.dueTime.split(":").map((v) => parseInt(v, 10))
    const d = new Date()
    d.setHours(h, m, 0, 0)
    const t = d
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: m === 0 ? undefined : "2-digit",
      })
      .toLowerCase()
      .replace(/\s/g, "")
    whenParts.push(t)
  }
  const tail = whenParts.length > 0 ? ` , ${whenParts.join(" , ")}` : ""
  return `Added: ${task.title}${tail}`
}

export function QuickAdd() {
  const [value, setValue] = useState("")
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(next: Toast) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(next)
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  function dismissToast() {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = value.trim()
    if (!input || pending) return

    startTransition(async () => {
      const parsed = await parseTaskInput(input)
      if (!parsed.ok) {
        showToast({ kind: "error", message: parsed.error })
        return
      }

      const { task } = parsed
      const fd = new FormData()
      fd.set("title", task.title)
      fd.set("priority", task.priority)
      if (task.dueDate) fd.set("dueDate", task.dueDate)
      if (task.addToCalendar && task.dueDate && task.dueTime) {
        fd.set("addToCalendar", "true")
        fd.set("calendarId", "local")
      }

      try {
        await createTask(fd)
        setValue("")
        showToast({
          kind: "success",
          summary: formatPreview(task),
        })
      } catch {
        showToast({ kind: "error", message: "Couldn't save that task." })
      }
    })
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit}>
        <label
          htmlFor="quick-add-input"
          className="sr-only"
        >
          Quick add a task in natural language
        </label>
        <div className="group flex items-center gap-2 rounded-[--radius-lg] border border-border-light bg-surface px-3.5 py-2.5 shadow-sm transition-colors duration-150 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20">
          {pending ? (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-accent"
              aria-hidden="true"
            />
          ) : (
            <Sparkles
              className="h-4 w-4 shrink-0 text-accent"
              aria-hidden="true"
            />
          )}
          <input
            id="quick-add-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Try: review PR Friday at 2pm"
            disabled={pending}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-foreground-quaternary disabled:opacity-60"
          />
          {value.trim().length > 0 && (
            <button
              type="submit"
              disabled={pending}
              className="shrink-0 rounded-[--radius-md] bg-accent px-3 py-1 text-xs font-medium text-white shadow-sm outline-none transition-all duration-150 hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:opacity-50"
            >
              Add
            </button>
          )}
        </div>
      </form>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-[--radius-md] border border-border-light bg-surface px-3 py-2 text-[13px] shadow-sm transition-opacity duration-200"
        >
          <Sparkles
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${toast.kind === "success" ? "text-accent" : "text-danger"}`}
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1 leading-snug text-foreground">
            {toast.kind === "success" ? toast.summary : toast.message}
          </p>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss"
            className="shrink-0 rounded p-0.5 text-foreground-quaternary outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
