"use client"

import { createEvent, updateEvent, deleteEvent } from "@/lib/actions/calendar"
import { Button } from "@/app/components/ui/button"
import { X } from "lucide-react"
import { useTransition } from "react"

interface EventFormProps {
  event?: {
    id: string
    title: string
    description: string | null
    startTime: string
    endTime: string
    allDay: boolean
    color: string | null
  }
  defaultDate?: string
  onClose: () => void
}

const colors = [
  { value: "#0071e3", label: "Blue" },
  { value: "#34c759", label: "Green" },
  { value: "#ff9f0a", label: "Orange" },
  { value: "#ff3b30", label: "Red" },
  { value: "#af52de", label: "Purple" },
  { value: "#5ac8fa", label: "Cyan" },
]

export function EventForm({ event, defaultDate, onClose }: EventFormProps) {
  const [isPending, startTransition] = useTransition()
  const isEditing = !!event

  const defaultStart = event
    ? event.startTime.slice(0, 16)
    : defaultDate
      ? `${defaultDate}T09:00`
      : `${new Date().toISOString().split("T")[0]}T09:00`

  const defaultEnd = event
    ? event.endTime.slice(0, 16)
    : defaultDate
      ? `${defaultDate}T10:00`
      : `${new Date().toISOString().split("T")[0]}T10:00`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-[--radius-xl] border border-border-light bg-surface p-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold tracking-tight">
            {isEditing ? "Edit Event" : "New Event"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-[--radius-sm] p-1.5 text-foreground-tertiary hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          action={(formData) => {
            startTransition(async () => {
              if (isEditing) {
                await updateEvent(event.id, formData)
              } else {
                await createEvent(formData)
              }
              onClose()
            })
          }}
          className="space-y-4"
        >
          <input
            name="title"
            placeholder="Event title"
            defaultValue={event?.title}
            required
            autoFocus
            className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-foreground-quaternary"
          />

          <textarea
            name="description"
            placeholder="Description (optional)"
            defaultValue={event?.description ?? ""}
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-foreground-secondary outline-none placeholder:text-foreground-quaternary"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-secondary">
                Start
              </label>
              <input
                name="startTime"
                type="datetime-local"
                defaultValue={defaultStart}
                required
                className="h-9 w-full rounded-[--radius-md] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-secondary">
                End
              </label>
              <input
                name="endTime"
                type="datetime-local"
                defaultValue={defaultEnd}
                className="h-9 w-full rounded-[--radius-md] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-accent"
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

          {/* Color picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground-secondary">
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
                      (!event && c.value === "#0071e3")
                    }
                    className="peer sr-only"
                  />
                  <div
                    className="h-6 w-6 rounded-full transition-transform peer-checked:scale-125 peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-offset-surface"
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
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
