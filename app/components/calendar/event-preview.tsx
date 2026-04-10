"use client"

import { formatEventTime } from "@/lib/calendar-utils"
import { Clock, MapPin, FileText, Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { deleteEvent } from "@/lib/actions/calendar"
import { useTransition } from "react"

type CalendarEvent = {
  id: string
  title: string
  description: string | null
  notes?: string | null
  startTime: string
  endTime: string
  color: string | null
  allDay: boolean
  source?: string
  calendarId?: string
}

interface EventPreviewProps {
  event: CalendarEvent
  onClose: () => void
  onEdit: () => void
}

export function EventPreview({ event, onClose, onEdit }: EventPreviewProps) {
  const [isPending, startTransition] = useTransition()
  const isGoogle = event.source === "google"

  const date = new Date(event.startTime.split("T")[0] + "T12:00:00")
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-[--radius-xl] border border-border-light/40 bg-surface/95 backdrop-blur-2xl shadow-lg overflow-hidden">
        {/* Color bar */}
        <div
          className="h-1.5"
          style={{ backgroundColor: event.color || "var(--accent)" }}
        />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground truncate">
                {event.title}
              </h3>
              <p className="text-sm text-foreground-secondary mt-0.5">
                {dateLabel}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 ml-2 rounded-[--radius-sm] p-1 text-foreground-quaternary hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Time */}
          <div className="space-y-2.5 mb-5">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-foreground-tertiary shrink-0" />
              <span className="text-sm text-foreground-secondary">
                {event.allDay
                  ? "All day"
                  : `${formatEventTime(event.startTime)} – ${formatEventTime(event.endTime)}`}
              </span>
            </div>

            {event.description && (
              <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-foreground-tertiary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground-secondary line-clamp-3">
                  {event.description}
                </p>
              </div>
            )}

            {event.notes && (
              <div className="rounded-[--radius-md] bg-accent-subtle p-3 mt-2">
                <p className="text-xs font-medium text-foreground-tertiary mb-1">Notes</p>
                <p className="text-sm text-foreground-secondary line-clamp-4">
                  {event.notes}
                </p>
              </div>
            )}

            {isGoogle && (
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: event.color || "var(--accent)" }}
                />
                <span className="text-xs text-foreground-quaternary">
                  Google Calendar
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              className="flex-1"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            {!isGoogle && (
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await deleteEvent(event.id)
                    onClose()
                  })
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-danger" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
