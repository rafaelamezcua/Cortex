"use client"

import { useState, useEffect, useTransition } from "react"
import { MonthView } from "./month-view"
import { DayView } from "./day-view"
import { EventForm } from "./event-form"
import { Button } from "@/app/components/ui/button"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { getMonthName } from "@/lib/calendar-utils"
import { cn } from "@/lib/utils"

type CalendarEvent = {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  color: string | null
  allDay: boolean
}

interface CalendarViewProps {
  initialEvents: CalendarEvent[]
}

export function CalendarView({ initialEvents }: CalendarViewProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(
    now.toISOString().split("T")[0]
  )
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [, startTransition] = useTransition()

  // Refresh events when month changes (re-fetch from server)
  useEffect(() => {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}T23:59:59`

    fetch(`/api/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      .then((r) => r.json())
      .then((data) => setEvents(data.events))
      .catch(() => {})
  }, [year, month, showForm, editingEvent])

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  function goToToday() {
    const today = new Date()
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDate(today.toISOString().split("T")[0])
  }

  const selectedEvents = selectedDate
    ? events.filter((e) => e.startTime.startsWith(selectedDate))
    : []

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            {getMonthName(month)} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-[--radius-sm] text-foreground-secondary transition-colors hover:bg-surface-hover"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-[--radius-sm] text-foreground-secondary transition-colors hover:bg-surface-hover"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="rounded-[--radius-sm] border border-border px-3 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-hover"
          >
            Today
          </button>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          New Event
        </Button>
      </div>

      {/* Month grid + day detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <MonthView
          year={year}
          month={month}
          events={events}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {selectedDate && (
          <div className="rounded-[--radius-lg] border border-border-light bg-surface p-4">
            <DayView
              date={selectedDate}
              events={selectedEvents}
              onCreateEvent={() => setShowForm(true)}
              onEditEvent={(event) => setEditingEvent(event)}
            />
          </div>
        )}
      </div>

      {/* Event form dialog */}
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
    </div>
  )
}
