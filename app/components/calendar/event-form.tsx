"use client"

import { createEvent, updateEvent, deleteEvent } from "@/lib/actions/calendar"
import { formatDateKey } from "@/lib/calendar-utils"
import { Button } from "@/app/components/ui/button"
import { X, Calendar as CalendarIcon } from "lucide-react"
import { useTransition, useEffect, useState, useRef, useCallback } from "react"

interface CalendarInfo {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

interface EventFormProps {
  event?: {
    id: string
    title: string
    description: string | null
    notes?: string | null
    startTime: string
    endTime: string
    allDay: boolean
    color: string | null
    source?: string
    calendarId?: string
    recurrence?: string | null
  }
  defaultDate?: string
  onClose: () => void
}

const colors = [
  { value: "#7986cb", label: "Lavender" },
  { value: "#33b679", label: "Sage" },
  { value: "#8e24aa", label: "Grape" },
  { value: "#e67c73", label: "Flamingo" },
  { value: "#f6bf26", label: "Banana" },
  { value: "#039be5", label: "Peacock" },
]

export function EventForm({ event, defaultDate, onClose }: EventFormProps) {
  const [isPending, startTransition] = useTransition()
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState<string>("local")
  const [notes, setNotes] = useState(event?.notes || "")
  const [title, setTitle] = useState(event?.title || "")
  const [description, setDescription] = useState(event?.description || "")
  const isEditing = !!event
  const isGoogleEvent = event?.source === "google"
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>("")

  const defaultStart = event
    ? event.startTime.slice(0, 16)
    : defaultDate
      ? `${defaultDate}T09:00`
      : `${formatDateKey(new Date())}T09:00`

  const defaultEnd = event
    ? event.endTime.slice(0, 16)
    : defaultDate
      ? `${defaultDate}T10:00`
      : `${formatDateKey(new Date())}T10:00`

  // Fetch Google Calendars
  useEffect(() => {
    fetch("/api/calendars")
      .then((r) => r.json())
      .then((data) => {
        if (data.calendars?.length) {
          setCalendars(data.calendars)
          if (!isEditing) {
            const primary = data.calendars.find((c: CalendarInfo) => c.primary)
            if (primary) setSelectedCalendar(primary.id)
          }
        }
      })
      .catch(() => {})
  }, [isEditing])

  // Auto-save notes for existing events
  const autoSaveNotes = useCallback(
    (value: string) => {
      if (!isEditing || !event) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setAutoSaveStatus("Saving...")
      saveTimer.current = setTimeout(async () => {
        const formData = new FormData()
        formData.set("title", title || event.title)
        formData.set("description", description || event.description || "")
        formData.set("notes", value)
        formData.set("startTime", event.startTime)
        formData.set("endTime", event.endTime)
        if (event.allDay) formData.set("allDay", "on")
        formData.set("color", event.color || "#7986cb")
        await updateEvent(event.id, formData)
        setAutoSaveStatus("Saved")
        setTimeout(() => setAutoSaveStatus(""), 2000)
      }, 600)
    },
    [isEditing, event, title, description]
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[--radius-2xl] border border-border-light bg-glass-surface-floating p-7 shadow-xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2
            className="text-[22px] font-medium tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {isEditing ? "Edit event" : "New event"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          action={(formData) => {
            formData.set("notes", notes)
            if (selectedCalendar !== "local") {
              formData.set("googleCalendarId", selectedCalendar)
            }
            startTransition(async () => {
              if (isEditing) {
                await updateEvent(event.id, formData)
              } else {
                await createEvent(formData)
              }
              onClose()
            })
          }}
          className="space-y-5"
        >
          {/* Title */}
          <input
            name="title"
            placeholder="What's happening?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className="w-full bg-transparent text-[17px] font-semibold tracking-tight text-foreground outline-none placeholder:text-foreground-quaternary"
          />

          {/* Description */}
          <textarea
            name="description"
            placeholder="Add a description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-foreground-secondary outline-none placeholder:text-foreground-quaternary"
          />

          {/* Calendar selector */}
          {calendars.length > 0 && !isGoogleEvent && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
                Calendar
              </label>
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
                  <CalendarIcon className="h-3 w-3" />
                  Local
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
            </div>
          )}

          {/* Date/time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
                Start
              </label>
              <input
                name="startTime"
                type="datetime-local"
                defaultValue={defaultStart}
                required
                className="h-11 w-full rounded-[--radius-lg] border border-border-light bg-surface px-3.5 text-sm text-foreground outline-none transition-colors duration-150 focus:border-accent/60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
                End
              </label>
              <input
                name="endTime"
                type="datetime-local"
                defaultValue={defaultEnd}
                className="h-11 w-full rounded-[--radius-lg] border border-border-light bg-surface px-3.5 text-sm text-foreground outline-none transition-colors duration-150 focus:border-accent/60"
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              name="allDay"
              type="checkbox"
              defaultChecked={event?.allDay}
              className="h-4 w-4 rounded accent-accent"
            />
            <span className="text-sm text-foreground-secondary">All day</span>
          </label>

          {/* Recurrence */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
              Repeat
            </label>
            <select
              name="recurrence"
              defaultValue={event?.recurrence || "none"}
              className="h-11 w-full rounded-[--radius-lg] border border-border-light bg-surface px-3.5 text-sm text-foreground outline-none transition-colors duration-150 focus:border-accent/60"
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Every day</option>
              <option value="weekdays">Every weekday (Mon–Fri)</option>
              <option value="weekly">Every week</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Every month</option>
            </select>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
              Color
            </label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <label key={c.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={c.value}
                    defaultChecked={
                      event?.color === c.value ||
                      (!event && c.value === "#7986cb")
                    }
                    className="peer sr-only"
                  />
                  <div
                    className="h-7 w-7 rounded-full transition-transform duration-200 peer-checked:scale-125 peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-offset-surface"
                    style={{
                      backgroundColor: c.value,
                      // @ts-expect-error CSS custom property
                      "--tw-ring-color": c.value,
                    }}
                    title={c.label}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Notes — inline editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
                Notes
              </label>
              {autoSaveStatus && (
                <span className="text-xs text-foreground-quaternary">
                  {autoSaveStatus}
                </span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                autoSaveNotes(e.target.value)
              }}
              placeholder="Add notes for this event..."
              rows={4}
              className="w-full resize-none rounded-[--radius-lg] border border-border-light bg-surface p-3.5 text-sm leading-relaxed text-foreground outline-none transition-colors duration-150 placeholder:text-foreground-quaternary focus:border-accent/60"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {isEditing ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await deleteEvent(event.id)
                    onClose()
                  })
                }}
              >
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={isPending}>
                {isEditing ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
