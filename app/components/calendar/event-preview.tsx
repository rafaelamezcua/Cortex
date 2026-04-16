"use client"

import { formatEventTime } from "@/lib/calendar-utils"
import {
  Clock,
  FileText,
  Pencil,
  Trash2,
  X,
  Upload,
  Check,
  StickyNote,
  Plus,
} from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import {
  createNoteForEvent,
  getNotesForEvent,
} from "@/lib/actions/notes"
import { useRouter } from "next/navigation"

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

type LinkedNote = {
  id: string
  title: string
  updatedAt: string
}

export function EventPreview({ event, onClose, onEdit }: EventPreviewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [googleCals, setGoogleCals] = useState<GoogleCal[]>([])
  const [showSyncPicker, setShowSyncPicker] = useState(false)
  const [linkedNotes, setLinkedNotes] = useState<LinkedNote[]>([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState("")
  const [creatingNote, setCreatingNote] = useState(false)
  const isGoogle = event.source === "google"
  const isLocal = !isGoogle

  const eventDate = event.startTime.split("T")[0]
  const date = new Date(eventDate + "T12:00:00")
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  // Load notes linked to this event
  useEffect(() => {
    let cancelled = false
    setNotesLoading(true)
    getNotesForEvent(event.id)
      .then((rows) => {
        if (cancelled) return
        setLinkedNotes(
          rows.map((r) => ({
            id: r.id,
            title: r.title,
            updatedAt: r.updatedAt,
          }))
        )
      })
      .catch(() => {
        if (!cancelled) setLinkedNotes([])
      })
      .finally(() => {
        if (!cancelled) setNotesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [event.id])

  async function handleCreateNote() {
    const trimmed = newNoteTitle.trim()
    if (!trimmed || creatingNote) return
    setCreatingNote(true)
    try {
      const result = await createNoteForEvent({
        title: trimmed,
        eventId: event.id,
        eventDate,
      })
      if (result?.id) {
        onClose()
        router.push(`/notes/${result.id}`)
      }
    } finally {
      setCreatingNote(false)
    }
  }

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-[--radius-2xl] border border-border-light bg-glass-surface-floating shadow-xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color bar */}
        <div
          className="h-2"
          style={{ backgroundColor: event.color || "var(--accent)" }}
        />

        <div className="p-6">
          {/* Header */}
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3
                className="truncate text-[19px] font-semibold tracking-tight text-foreground"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {event.title}
              </h3>
              <p className="mt-1 text-sm text-foreground-secondary">
                {dateLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground-tertiary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
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
              <div className="mt-2 rounded-[--radius-lg] border border-accent/15 bg-accent-subtle p-3.5">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                  Notes
                </p>
                <p className="text-sm leading-relaxed text-foreground-secondary line-clamp-4">
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
                    className="flex w-full items-center gap-2.5 rounded-[--radius-lg] px-3 py-2 text-sm transition-colors duration-150 hover:bg-surface-hover disabled:opacity-50"
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

          {/* Related notes */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                Related notes
              </p>
              {!showNoteInput && (
                <button
                  type="button"
                  onClick={() => setShowNoteInput(true)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-foreground-tertiary outline-none transition-all duration-150 hover:bg-surface-hover hover:text-accent focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                >
                  <Plus className="h-3 w-3" />
                  New note
                </button>
              )}
            </div>

            {showNoteInput && (
              <div className="mb-2 flex items-center gap-2">
                <input
                  autoFocus
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleCreateNote()
                    } else if (e.key === "Escape") {
                      setShowNoteInput(false)
                      setNewNoteTitle("")
                    }
                  }}
                  placeholder="Note title"
                  className="h-8 min-w-0 flex-1 rounded-[--radius-md] border border-border bg-surface px-2.5 text-xs font-medium text-foreground outline-none transition-colors duration-150 placeholder:text-foreground-quaternary focus:border-accent/60"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateNote}
                  disabled={creatingNote || !newNoteTitle.trim()}
                >
                  Create
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNoteInput(false)
                    setNewNoteTitle("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {notesLoading ? (
              <p className="text-xs text-foreground-quaternary">Loading...</p>
            ) : linkedNotes.length === 0 ? (
              <p className="text-xs text-foreground-quaternary">
                No notes linked yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {linkedNotes.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/notes/${n.id}`}
                      onClick={onClose}
                      className="flex items-center gap-2 rounded-[--radius-md] border border-border-light bg-surface px-2.5 py-2 text-xs text-foreground outline-none transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                    >
                      <StickyNote className="h-3.5 w-3.5 shrink-0 text-foreground-tertiary" />
                      <span className="truncate">{n.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
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
                if (!confirm("Delete this event?")) return
                startTransition(async () => {
                  await fetch("/api/calendar/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      eventId: event.id,
                      calendarId: event.calendarId,
                    }),
                  })
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
