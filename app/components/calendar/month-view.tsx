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
      <div className="grid grid-cols-7 mb-1">
        {weekdays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-foreground-quaternary"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-[--radius-lg] border border-border-light bg-border-light overflow-hidden">
        {grid.map((date, i) => {
          if (!date) {
            return (
              <div
                key={`empty-${i}`}
                className="min-h-24 bg-background-secondary p-1.5"
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
              onClick={() => onSelectDate(dateKey)}
              className={cn(
                "min-h-24 bg-surface p-1.5 text-left transition-colors duration-150 hover:bg-surface-hover",
                isSelected && "bg-accent-light"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm",
                  today && "bg-accent text-white font-semibold",
                  !today && "text-foreground"
                )}
              >
                {date.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((event, idx) => (
                  <div
                    key={`${event.id}-${idx}`}
                    className="truncate rounded px-1 py-0.5 text-xs text-white"
                    style={{ backgroundColor: event.color || "#0071e3" }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-xs text-foreground-tertiary">
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
