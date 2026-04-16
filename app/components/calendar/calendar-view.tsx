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
  // Neutral defaults — hydrated with real date/localStorage in useEffect below
  // to avoid SSR/client mismatch when the server clock differs from the client
  // (e.g. date rolls over between server render and client hydration).
  const [mounted, setMounted] = useState(false)
  const [year, setYearRaw] = useState(2026)
  const [month, setMonthRaw] = useState(0)
  const [selectedDate, setSelectedDateRaw] = useState<string | null>(null)
  const [viewMode, setViewModeRaw] = useState<ViewMode>("month")

  useEffect(() => {
    const now = new Date()
    const saved = loadCalState()
    setYearRaw(saved?.year ?? now.getFullYear())
    setMonthRaw(saved?.month ?? now.getMonth())
    setSelectedDateRaw(saved?.selectedDate ?? formatDateKey(now))
    setViewModeRaw((saved?.viewMode as ViewMode) ?? "month")
    setMounted(true)
  }, [])

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

  // Fetch calendar list — only add NEW calendars, respect saved preferences
  const refreshCalendars = useCallback(() => {
    fetch("/api/calendars")
      .then((r) => r.json())
      .then((data) => {
        const list: CalendarInfo[] = data.calendars ?? []
        setCalendars(list)

        const hasSavedPrefs = localStorage.getItem("luma-cal-enabled")
        if (!hasSavedPrefs) {
          setEnabledCalendars((prev) => {
            const next = new Set(prev)
            list.forEach((c) => next.add(c.id))
            localStorage.setItem("luma-cal-enabled", JSON.stringify([...next]))
            return next
          })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!mounted) return
    refreshCalendars()
  }, [mounted, refreshCalendars])

  // Fetch events — gated on `mounted` to prevent stale fetches with the
  // dummy pre-mount year/month values (which would race with the real fetch
  // and sometimes overwrite real events with empty results).
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
    if (!mounted) return
    fetchEvents()
  }, [fetchEvents, mounted])

  useEffect(() => {
    if (!mounted) return
    if (!showForm && !editingEvent) fetchEvents()
  }, [showForm, editingEvent, fetchEvents, mounted])

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

  if (!mounted) {
    return (
      <div className="flex items-center justify-center rounded-[--radius-2xl] border border-border-light bg-surface py-20 shadow-sm">
        <p className="text-sm text-foreground-tertiary">Loading calendar...</p>
      </div>
    )
  }

  return (
    <div className="flex gap-6 -mx-4 sm:-mx-8">
      {/* Left sidebar */}
      <div className="hidden lg:block w-56 shrink-0 pl-4 sm:pl-8">
        <CalendarSidebar
          calendars={calendars}
          enabledCalendars={enabledCalendars}
          onToggleCalendar={toggleCalendar}
          onRefreshCalendars={refreshCalendars}
          onRefreshEvents={fetchEvents}
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2
                className="text-[22px] font-medium tracking-tight text-foreground"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {headerLabel}
              </h2>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={prevPeriod}
                  aria-label="Previous period"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-tertiary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={nextPeriod}
                  aria-label="Next period"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-tertiary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={goToToday}
                className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground-secondary transition-all duration-150 ease-out hover:border-accent/60 hover:bg-accent-subtle hover:text-accent"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* View switcher */}
              <div className="flex rounded-full border border-border-light bg-surface p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => changeViewMode("month")}
                  title="Month view (M)"
                  aria-label="Month view"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ease-out",
                    viewMode === "month"
                      ? "bg-accent text-white shadow-sm"
                      : "text-foreground-tertiary hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => changeViewMode("week")}
                  title="Week view (W)"
                  aria-label="Week view"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ease-out",
                    viewMode === "week"
                      ? "bg-accent text-white shadow-sm"
                      : "text-foreground-tertiary hover:text-foreground"
                  )}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => changeViewMode("agenda")}
                  title="Agenda view (A)"
                  aria-label="Agenda view"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ease-out",
                    viewMode === "agenda"
                      ? "bg-accent text-white shadow-sm"
                      : "text-foreground-tertiary hover:text-foreground"
                  )}
                >
                  <Rows3 className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button size="sm" onClick={handleNewEvent}>
                <Plus className="h-4 w-4" />
                New event
              </Button>
            </div>
          </div>

          {/* Conflict warnings */}
          {conflicts.length > 0 && (
            <div className="rounded-[--radius-lg] border border-warning/30 bg-warning/5 px-4 py-2.5">
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
                <div className="rounded-[--radius-2xl] border border-border-light bg-surface p-5 shadow-md">
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
                      <div className="flex-1 space-y-2">
                        {dayEvents.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => handleEventClick(event)}
                            className="group flex w-full items-center gap-3 rounded-[--radius-lg] border border-border-light bg-surface p-3 text-left shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface-raised hover:shadow-md active:translate-y-0"
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
