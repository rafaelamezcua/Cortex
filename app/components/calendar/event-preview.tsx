"use client"

import { formatEventTime } from "@/lib/calendar-utils"
import { Clock, FileText, Pencil, Trash2, X, Upload, Check } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { deleteEvent } from "@/lib/actions/calendar"
import { useState, useTransition, useEffect } from "react"

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

interface GoogleCal {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

interface EventPreviewProps {
  event: CalendarEvent
  onClose: () => void
  onEdit: () => void
}

export function EventPreview({ event, onClose, onEdit }: EventPreviewProps) {
  const [isPending, startTransition] = useTransition()
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [googleCals, setGoogleCals] = useState<GoogleCal[]>([])
  const [showSyncPicker, setShowSyncPicker] = useState(false)
  const isGoogle = event.source === "google"
  const isLocal = !isGoogle

  const date = new Date(event.startTime.split("T")[0] + "T12:00:00")
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  // Fetch Google calendars for sync picker
  useEffect(() => {
    if (!showSyncPicker) return
    fetch("/api/calendars")
      .then((r) => r.json())
      .then((data) => {
        const gcals = (data.calendars || []).filter(
          (c: GoogleCal & { source?: string }) => c.source === "google" || (!c.id.startsWith("local-"))
        )
        setGoogleCals(gcals)
      })
      .catch(() => {})
  }, [showSyncPicker])

  async function syncToGoogle(googleCalendarId: string) {
    setSyncing(true)
    try {
      const res = await fetch("/api/calendar/sync-to-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, googleCalendarId }),
      })
      if (res.ok) {
        setSynced(true)
        setShowSyncPicker(false)
        setTimeout(() => onClose(), 1500)
      }
    } catch {
      // Failed silently
    }
    setSyncing(false)
  }

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

          {/* Details */}
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

            {/* Synced confirmation */}
            {synced && (
              <div className="flex items-center gap-2 text-success text-sm">
                <Check className="h-4 w-4" />
                Synced to Google Calendar
              </div>
            )}
          </div>

          {/* Google Calendar picker for sync */}
          {showSyncPicker && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
                Sync to which calendar?
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {googleCals.map((cal) => (
                  <button
                    key={cal.id}
                    onClick={() => syncToGoogle(cal.id)}
                    disabled={syncing}
                    className="flex w-full items-center gap-2.5 rounded-[--radius-md] px-3 py-2 text-sm transition-colors hover:bg-surface-hover disabled:opacity-50"
                  >
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: cal.backgroundColor }}
                    />
                    <span className="text-foreground truncate">{cal.summary}</span>
                    {cal.primary && (
                      <span className="text-xs text-foreground-quaternary">(primary)</span>
                    )}
                  </button>
                ))}
                {googleCals.length === 0 && (
                  <p className="text-xs text-foreground-tertiary py-2">
                    No Google Calendars found
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowSyncPicker(false)}
                className="text-xs text-foreground-tertiary hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}

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

            {/* Sync to Google — only for local events */}
            {isLocal && !synced && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSyncPicker(true)}
                disabled={syncing}
              >
                <Upload className="h-3.5 w-3.5" />
                Sync
              </Button>
            )}

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
          </div>
        </div>
      </div>
    </div>
  )
}
