"use client"

import { createTask } from "@/lib/actions/tasks"
import { Button } from "@/app/components/ui/button"
import { Plus, Calendar as CalendarIcon, Repeat } from "lucide-react"
import { useRef, useState, useEffect } from "react"

interface CalendarInfo {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

export function TaskForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [addToCalendar, setAddToCalendar] = useState(false)
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState<string>("local")
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!isOpen) return
    fetch("/api/calendars")
      .then((r) => r.json())
      .then((data) => {
        if (data.calendars?.length) {
          setCalendars(data.calendars)
          const primary = data.calendars.find((c: CalendarInfo) => c.primary)
          if (primary) setSelectedCalendar(primary.id)
        }
      })
      .catch(() => {})
  }, [isOpen])

  async function handleSubmit(formData: FormData) {
    if (addToCalendar) {
      formData.set("addToCalendar", "true")
      formData.set("calendarId", selectedCalendar)
    }
    await createTask(formData)
    formRef.current?.reset()
    setIsOpen(false)
    setAddToCalendar(false)
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-2 rounded-[--radius-lg] border border-dashed border-border px-4 py-3.5 text-sm font-medium text-foreground-tertiary transition-all duration-200 ease-out hover:border-accent/60 hover:bg-accent-subtle hover:text-accent"
      >
        <Plus className="h-4 w-4" />
        Add task
      </button>
    )
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="space-y-4 rounded-[--radius-xl] border border-border-light bg-surface p-5 shadow-md"
    >
      <input
        name="title"
        placeholder="What needs doing?"
        autoFocus
        required
        className="w-full bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-foreground-quaternary"
      />
      <textarea
        name="description"
        placeholder="Add a note (optional)"
        rows={2}
        className="w-full resize-none bg-transparent text-sm text-foreground-secondary outline-none placeholder:text-foreground-quaternary"
      />
      <div className="flex flex-wrap items-center gap-3">
        <select
          name="priority"
          defaultValue="medium"
          className="h-9 rounded-[--radius-md] border border-border bg-background px-3 text-xs text-foreground-secondary outline-none"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          name="dueDate"
          type="date"
          className="h-9 rounded-[--radius-md] border border-border bg-background px-3 text-xs text-foreground-secondary outline-none"
        />

        <label className="flex h-9 items-center gap-1.5 rounded-[--radius-md] border border-border bg-background px-3 text-xs text-foreground-secondary focus-within:border-accent/60">
          <Repeat className="h-3 w-3 text-foreground-quaternary" />
          <select
            name="recurrence"
            defaultValue="none"
            aria-label="Recurrence"
            className="bg-transparent outline-none"
          >
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        {/* Add to calendar toggle */}
        <button
          type="button"
          onClick={() => setAddToCalendar(!addToCalendar)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
            addToCalendar
              ? "border-accent bg-accent-light text-accent"
              : "border-border text-foreground-tertiary hover:border-accent/30"
          }`}
        >
          <CalendarIcon className="h-3 w-3" />
          Add to calendar
        </button>
      </div>

      {/* Calendar selector */}
      {addToCalendar && calendars.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCalendar("local")}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
              selectedCalendar === "local"
                ? "border-accent bg-accent-light text-accent"
                : "border-border text-foreground-secondary hover:border-accent/30"
            }`}
          >
            Local only
          </button>
          {calendars.map((cal) => (
            <button
              key={cal.id}
              type="button"
              onClick={() => setSelectedCalendar(cal.id)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                selectedCalendar === cal.id
                  ? "border-accent bg-accent-light text-accent"
                  : "border-border text-foreground-secondary hover:border-accent/30"
              }`}
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: cal.backgroundColor }}
              />
              {cal.summary}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setIsOpen(false); setAddToCalendar(false) }}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Add
        </Button>
      </div>
    </form>
  )
}
