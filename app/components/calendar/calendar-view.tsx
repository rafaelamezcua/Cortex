"use client"

import { useState, useEffect, useCallback } from "react"
import { MonthView } from "./month-view"
import { WeekView } from "./week-view"
import { DayView } from "./day-view"
import { CalendarSidebar } from "./calendar-sidebar"
import { EventForm } from "./event-form"
import { EventPreview } from "./event-preview"
import { Button } from "@/app/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, Rows3, CalendarDays } from "lucide-react"
import { getMonthName, formatDateKey } from "@/lib/calendar-utils"
import { cn } from "@/lib/utils"

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

interface CalendarInfo {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

interface CalendarViewProps {
  initialEvents: CalendarEvent[]
}

type ViewMode = "month" | "week" | "agenda"

function loadCalState() {
  if (typeof window === "undefined") return null
  try {
    const saved = localStorage.getItem("luma-cal-state")
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

function saveCalState(state: { year: number; month: number; selectedDate: string | null; viewMode: string }) {
  localStorage.setItem("luma-cal-state", JSON.stringify(state))
}

export function CalendarView({ initialEvents }: CalendarViewProps) {
  const now = new Date()
  const saved = loadCalState()

  const [year, setYearRaw] = useState(saved?.year ?? now.getFullYear())
  const [month, setMonthRaw] = useState(saved?.month ?? now.getMonth())
  const [selectedDate, setSelectedDateRaw] = useState<string | null>(
    saved?.selectedDate ?? formatDateKey(now)
  )
  const [viewMode, setViewModeRaw] = useState<ViewMode>(
    (saved?.viewMode as ViewMode) ?? "month"
  )

  // Wrapped setters that persist to localStorage
  function setYear(y: number) { setYearRaw(y); saveCalState({ year: y, month, selectedDate, viewMode }) }
  function setMonth(m: number) { setMonthRaw(m); saveCalState({ year, month: m, selectedDate, viewMode }) }
  function setSelectedDate(d: string | null) { setSelectedDateRaw(d); saveCalState({ year, month, selectedDate: d, viewMode }) }
  function changeViewMode(mode: ViewMode) { setViewModeRaw(mode); saveCalState({ year, month, selectedDate, viewMode: mode }) }
  const [showForm, setShowForm] = useState(false)
  const [formDefaults, setFormDefaults] = useState<{
    date?: string
    startTime?: string
    endTime?: string
  }>({})
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [previewEvent, setPreviewEvent] = useState<CalendarEvent | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [enabledCalendars, setEnabledCalendars] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("luma-cal-enabled")
      if (saved) {
        try { return new Set(JSON.parse(saved)) } catch {}
      }
    }
    return new Set(["local"])
  })

  // Fetch Google Calendar list — only add NEW calendars, respect saved preferences
  useEffect(() => {
    fetch("/api/calendars")
      .then((r) => r.json())
      .then((data) => {
        if (data.calendars?.length) {
          setCalendars(data.calendars)

          // Check if user has saved preferences before
          const hasSavedPrefs = localStorage.getItem("luma-cal-enabled")

          if (!hasSavedPrefs) {
            // First time — enable all calendars
            setEnabledCalendars((prev) => {
              const next = new Set(prev)
              data.calendars.forEach((c: CalendarInfo) => next.add(c.id))
              localStorage.setItem("luma-cal-enabled", JSON.stringify([...next]))
              return next
            })
          }
          // Otherwise: keep whatever the user had saved — don't touch enabledCalendars
        }
      })
      .catch(() => {})
  }, [])

  // Fetch events
  const fetchEvents = useCallback(() => {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}T23:59:59`

    fetch(`/api/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      .then((r) => r.json())
      .then((data) => setEvents(data.events))
      .catch(() => {})
  }, [year, month])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    if (!showForm && !editingEvent) fetchEvents()
  }, [showForm, editingEvent, fetchEvents])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (showForm || editingEvent || previewEvent) return

      switch (e.key) {
        case "t":
          e.preventDefault()
          goToToday()
          break
        case "n":
          e.preventDefault()
          setFormDefaults({ date: selectedDate || undefined })
          setShowForm(true)
          break
        case "m":
          e.preventDefault()
          changeViewMode("month")
          break
        case "w":
          e.preventDefault()
          changeViewMode("week")
          break
        case "a":
          e.preventDefault()
          changeViewMode("agenda")
          break
        case "ArrowLeft":
          e.preventDefault()
          prevPeriod()
          break
        case "ArrowRight":
          e.preventDefault()
          nextPeriod()
          break
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [showForm, editingEvent, previewEvent, selectedDate, viewMode, year, month])

  function toggleCalendar(id: string) {
    setEnabledCalendars((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem("luma-cal-enabled", JSON.stringify([...next]))
      return next
    })
  }

  const filteredEvents = events.filter((e) => {
    const calId = e.calendarId || "local"
    return enabledCalendars.has(calId)
  })

  function prevPeriod() {
    if (viewMode === "week") {
      const d = new Date(year, month, 1)
      d.setDate(d.getDate() - 7)
      setYear(d.getFullYear())
      setMonth(d.getMonth())
    } else {
      if (month === 0) { setMonth(11); setYear(year - 1) }
      else setMonth(month - 1)
    }
  }

  function nextPeriod() {
    if (viewMode === "week") {
      const d = new Date(year, month, 28)
      d.setDate(d.getDate() + 7)
      setYear(d.getFullYear())
      setMonth(d.getMonth())
    } else {
      if (month === 11) { setMonth(0); setYear(year + 1) }
      else setMonth(month + 1)
    }
  }

  function goToToday() {
    const today = new Date()
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDate(formatDateKey(today))
  }

  function handleNavigateMonth(y: number, m: number) {
    setYear(y)
    setMonth(m)
  }

  function handleEventClick(event: CalendarEvent) {
    setPreviewEvent(event)
  }

  function handleWeekCreateEvent(date: string, hour: number) {
    const startTime = `${date}T${String(hour).padStart(2, "0")}:00`
    const endTime = `${date}T${String(hour + 1).padStart(2, "0")}:00`
    setFormDefaults({ date, startTime, endTime })
    setShowForm(true)
  }

  function handleNewEvent() {
    setFormDefaults({ date: selectedDate || undefined })
    setShowForm(true)
  }

  const selectedEvents = selectedDate
    ? filteredEvents.filter((e) => e.startTime.startsWith(selectedDate))
    : []

  // Conflict detection — find overlapping events for the selected date
  const conflicts: string[] = []
  for (let i = 0; i < selectedEvents.length; i++) {
    for (let j = i + 1; j < selectedEvents.length; j++) {
      const a = selectedEvents[i]
      const b = selectedEvents[j]
      if (a.allDay || b.allDay) continue
      if (a.startTime < b.endTime && b.startTime < a.endTime) {
        conflicts.push(`"${a.title}" overlaps with "${b.title}"`)
      }
    }
  }

  // Agenda grouped by date
  const agendaEvents = [...filteredEvents].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )
  const agendaByDate = new Map<string, CalendarEvent[]>()
  for (const e of agendaEvents) {
    const dateKey = e.startTime.split("T")[0]
    if (!agendaByDate.has(dateKey)) agendaByDate.set(dateKey, [])
    agendaByDate.get(dateKey)!.push(e)
  }

  const headerLabel =
    viewMode === "week"
      ? `${getMonthName(month)} ${year}`
      : `${getMonthName(month)} ${year}`

  return (
    <div className="flex gap-6 -mx-4 sm:-mx-8">
      {/* Left sidebar */}
      <div className="hidden lg:block w-56 shrink-0 pl-4 sm:pl-8">
        <CalendarSidebar
          calendars={calendars}
          enabledCalendars={enabledCalendars}
          onToggleCalendar={toggleCalendar}
          year={year}
          month={month}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onNavigateMonth={handleNavigateMonth}
        />

        {/* Keyboard shortcuts hint */}
        <div className="mt-6 space-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary mb-2">
            Shortcuts
          </h3>
          {[
            ["T", "Today"],
            ["N", "New event"],
            ["M", "Month view"],
            ["W", "Week view"],
            ["A", "Agenda view"],
            ["← →", "Navigate"],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-background-secondary px-1 text-[10px] font-medium text-foreground-quaternary">
                {key}
              </kbd>
              <span className="text-[11px] text-foreground-quaternary">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 pr-4 sm:pr-8">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight">
                {headerLabel}
              </h2>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={prevPeriod}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-surface-hover"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextPeriod}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-surface-hover"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={goToToday}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-hover"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* View switcher */}
              <div className="flex rounded-[--radius-md] border border-border-light bg-background-secondary p-0.5">
                <button
                  onClick={() => changeViewMode("month")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[--radius-sm] transition-colors",
                    viewMode === "month"
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-foreground-tertiary hover:text-foreground"
                  )}
                  title="Month view (M)"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => changeViewMode("week")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[--radius-sm] transition-colors",
                    viewMode === "week"
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-foreground-tertiary hover:text-foreground"
                  )}
                  title="Week view (W)"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => changeViewMode("agenda")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[--radius-sm] transition-colors",
                    viewMode === "agenda"
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-foreground-tertiary hover:text-foreground"
                  )}
                  title="Agenda view (A)"
                >
                  <Rows3 className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button size="sm" onClick={handleNewEvent}>
                <Plus className="h-4 w-4" />
                New Event
              </Button>
            </div>
          </div>

          {/* Conflict warnings */}
          {conflicts.length > 0 && (
            <div className="rounded-[--radius-md] border border-warning/30 bg-warning/5 px-4 py-2.5">
              <p className="text-xs font-medium text-warning">
                Schedule conflict: {conflicts[0]}
                {conflicts.length > 1 && ` (+${conflicts.length - 1} more)`}
              </p>
            </div>
          )}

          {/* Views */}
          {viewMode === "month" && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">
              <MonthView
                year={year}
                month={month}
                events={filteredEvents}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
              {selectedDate && (
                <div className="rounded-[--radius-xl] border border-border-light/60 bg-surface p-5 shadow-sm">
                  <DayView
                    date={selectedDate}
                    events={selectedEvents}
                    onCreateEvent={handleNewEvent}
                    onEditEvent={handleEventClick}
                  />
                </div>
              )}
            </div>
          )}

          {viewMode === "week" && (
            <WeekView
              startDate={new Date(year, month, selectedDate ? parseInt(selectedDate.split("-")[2]) : 1)}
              events={filteredEvents}
              onSelectEvent={handleEventClick}
              onCreateEvent={handleWeekCreateEvent}
            />
          )}

          {viewMode === "agenda" && (
            <div className="space-y-4">
              {agendaByDate.size === 0 ? (
                <p className="py-12 text-center text-sm text-foreground-tertiary">
                  No events this month
                </p>
              ) : (
                Array.from(agendaByDate.entries()).map(([dateKey, dayEvents]) => {
                  const d = new Date(dateKey + "T12:00:00")
                  const label = d.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                  const todayKey = formatDateKey(new Date())

                  return (
                    <div key={dateKey} className="flex gap-4">
                      <div className="w-20 shrink-0 pt-1">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            dateKey === todayKey
                              ? "text-accent"
                              : "text-foreground-secondary"
                          )}
                        >
                          {label}
                        </p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {dayEvents.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => handleEventClick(event)}
                            className="flex w-full items-center gap-3 rounded-[--radius-lg] border border-border-light/60 bg-surface p-3 text-left transition-all duration-200 hover:shadow-sm hover:border-accent/20"
                          >
                            <div
                              className="h-8 w-1 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  event.color || "var(--accent)",
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {event.title}
                              </p>
                              <p className="text-xs text-foreground-tertiary">
                                {event.allDay
                                  ? "All day"
                                  : `${new Date(event.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${new Date(event.endTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <EventForm
          defaultDate={formDefaults.date}
          onClose={() => {
            setShowForm(false)
            setFormDefaults({})
          }}
        />
      )}
      {editingEvent && (
        <EventForm
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}
      {previewEvent && (
        <EventPreview
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
          onEdit={() => {
            setEditingEvent(previewEvent)
            setPreviewEvent(null)
          }}
        />
      )}
    </div>
  )
}
