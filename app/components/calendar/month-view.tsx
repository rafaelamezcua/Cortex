"use client"

import { cn } from "@/lib/utils"
import { getCalendarGrid, isToday, formatDateKey } from "@/lib/calendar-utils"

type CalendarEvent = {
  id: string
  title: string
  startTime: string
  color: string | null
  allDay: boolean
}

interface MonthViewProps {
  year: number
  month: number
  events: CalendarEvent[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function MonthView({
  year,
  month,
  events,
  selectedDate,
  onSelectDate,
}: MonthViewProps) {
  const grid = getCalendarGrid(year, month)

  // Group events by date
  const eventsByDate: Record<string, CalendarEvent[]> = {}
  for (const event of events) {
    const dateKey = event.startTime.split("T")[0]
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = []
    eventsByDate[dateKey].push(event)
  }

  return (
    <div>
      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7">
        {weekdays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[--radius-2xl] border border-border-light bg-border-light shadow-sm">
        {grid.map((date, i) => {
          if (!date) {
            return (
              <div
                key={`empty-${i}`}
                className="min-h-28 bg-background-secondary/60"
              />
            )
          }

          const dateKey = formatDateKey(date)
          const dayEvents = eventsByDate[dateKey] || []
          const today = isToday(date)
          const isSelected = selectedDate === dateKey

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={cn(
                "group relative min-h-28 p-2 text-left transition-all duration-200 ease-out",
                isSelected
                  ? "bg-accent-subtle"
                  : "bg-surface hover:bg-surface-raised"
              )}
            >
              {/* Date number */}
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-medium transition-colors duration-150",
                  today
                    ? "bg-accent font-semibold text-white shadow-sm"
                    : isSelected
                      ? "text-accent"
                      : "text-foreground"
                )}
              >
                {date.getDate()}
              </span>

              {/* Events */}
              <div className="mt-1.5 space-y-1">
                {dayEvents.slice(0, 3).map((event, idx) => (
                  <div
                    key={`${event.id}-${idx}`}
                    className="truncate rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium text-white shadow-sm"
                    style={{ backgroundColor: event.color || "var(--accent)" }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] font-medium text-foreground-tertiary">
                    +{dayEvents.length - 3} more
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
