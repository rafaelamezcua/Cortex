"use client"

import { useState, useEffect, useCallback } from "react"
import { MonthView } from "./month-view"
import { DayView } from "./day-view"
import { CalendarSidebar } from "./calendar-sidebar"
import { EventForm } from "./event-form"
import { EventPreview } from "./event-preview"
import { Button } from "@/app/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, Rows3 } from "lucide-react"
import { getMonthName } from "@/lib/calendar-utils"
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

type ViewMode = "month" | "agenda"

export function CalendarView({ initialEvents }: CalendarViewProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(
    now.toISOString().split("T")[0]
  )
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [previewEvent, setPreviewEvent] = useState<CalendarEvent | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [enabledCalendars, setEnabledCalendars] = useState<Set<string>>(
    new Set(["local"])
  )

  // Fetch Google Calendar list
  useEffect(() => {
    fetch("/api/calendars")
      .then((r) => r.json())
      .then((data) => {
        if (data.calendars?.length) {
          setCalendars(data.calendars)
          setEnabledCalendars((prev) => {
            const next = new Set(prev)
            data.calendars.forEach((c: CalendarInfo) => next.add(c.id))
            return next
          })
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

  // Re-fetch after form close
  useEffect(() => {
    if (!showForm && !editingEvent) fetchEvents()
  }, [showForm, editingEvent, fetchEvents])

  function toggleCalendar(id: string) {
    setEnabledCalendars((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter events by enabled calendars
  // Filter events by enabled calendars
  const filteredEvents = events.filter((e) => {
    const calId = e.calendarId || "local"
    return enabledCalendars.has(calId)
  })

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }

  function goToToday() {
    const today = new Date()
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDate(today.toISOString().split("T")[0])
  }

  function handleNavigateMonth(y: number, m: number) {
    setYear(y)
    setMonth(m)
  }

  const selectedEvents = selectedDate
    ? filteredEvents.filter((e) => e.startTime.startsWith(selectedDate))
    : []

  // Agenda: all events this month sorted by date
  const agendaEvents = [...filteredEvents].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )

  // Group agenda by date
  const agendaByDate = new Map<string, CalendarEvent[]>()
  for (const e of agendaEvents) {
    const dateKey = e.startTime.split("T")[0]
    if (!agendaByDate.has(dateKey)) agendaByDate.set(dateKey, [])
    agendaByDate.get(dateKey)!.push(e)
  }

  function handleEventClick(event: CalendarEvent) {
    setPreviewEvent(event)
  }

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
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 pr-4 sm:pr-8">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight">
                {getMonthName(month)} {year}
              </h2>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={prevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-surface-hover"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextMonth}
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
                  onClick={() => setViewMode("month")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[--radius-sm] transition-colors",
                    viewMode === "month"
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-foreground-tertiary hover:text-foreground"
                  )}
                  title="Month view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("agenda")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[--radius-sm] transition-colors",
                    viewMode === "agenda"
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-foreground-tertiary hover:text-foreground"
                  )}
                  title="Agenda view"
                >
                  <Rows3 className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                New Event
              </Button>
            </div>
          </div>

          {/* Views */}
          {viewMode === "month" ? (
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
                    onCreateEvent={() => setShowForm(true)}
                    onEditEvent={handleEventClick}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Agenda view */
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
                  const isToday = dateKey === new Date().toISOString().split("T")[0]

                  return (
                    <div key={dateKey} className="flex gap-4">
                      <div className="w-20 shrink-0 pt-1">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isToday ? "text-accent" : "text-foreground-secondary"
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
                              style={{ backgroundColor: event.color || "var(--accent)" }}
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
          defaultDate={selectedDate ?? undefined}
          onClose={() => setShowForm(false)}
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
