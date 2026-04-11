"use client"

import { cn } from "@/lib/utils"
import { isToday, formatDateKey } from "@/lib/calendar-utils"

type CalendarEvent = {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  color: string | null
  allDay: boolean
  source?: string
  calendarId?: string
}

interface WeekViewProps {
  startDate: Date
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
  onCreateEvent: (date: string, hour: number) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 60 // px per hour

function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = []
  const d = new Date(startDate)
  // Go to Sunday of this week
  d.setDate(d.getDate() - d.getDay())
  for (let i = 0; i < 7; i++) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function getEventPosition(event: CalendarEvent) {
  const start = new Date(event.startTime)
  const end = new Date(event.endTime)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  const duration = Math.max(endMinutes - startMinutes, 30) // min 30min display

  return {
    top: (startMinutes / 60) * HOUR_HEIGHT,
    height: (duration / 60) * HOUR_HEIGHT,
  }
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM"
  if (hour === 12) return "12 PM"
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

export function WeekView({
  startDate,
  events,
  onSelectEvent,
  onCreateEvent,
}: WeekViewProps) {
  const days = getWeekDays(startDate)

  // Group events by date
  const eventsByDate: Record<string, CalendarEvent[]> = {}
  const allDayEvents: Record<string, CalendarEvent[]> = {}

  for (const event of events) {
    const dateKey = event.startTime.split("T")[0]
    if (event.allDay) {
      if (!allDayEvents[dateKey]) allDayEvents[dateKey] = []
      allDayEvents[dateKey].push(event)
    } else {
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = []
      eventsByDate[dateKey].push(event)
    }
  }

  // Check if any day has all-day events
  const hasAllDay = days.some(
    (d) => (allDayEvents[formatDateKey(d)]?.length ?? 0) > 0
  )

  return (
    <div className="overflow-hidden rounded-[--radius-2xl] border border-border-light bg-surface shadow-md">
      {/* Header — day names + dates */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border-light">
        <div className="border-r border-border-light/50" />
        {days.map((day) => {
          const today = isToday(day)
          const dayName = day.toLocaleDateString("en-US", { weekday: "short" })
          const dayNum = day.getDate()

          return (
            <div
              key={formatDateKey(day)}
              className={cn(
                "flex flex-col items-center border-r border-border-light/50 py-3 last:border-r-0",
                today && "bg-accent-subtle"
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wider",
                  today ? "text-accent" : "text-foreground-quaternary"
                )}
              >
                {dayName}
              </span>
              <span
                className={cn(
                  "mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  today ? "bg-accent text-white shadow-sm" : "text-foreground"
                )}
              >
                {dayNum}
              </span>
            </div>
          )
        })}
      </div>

      {/* All-day events row */}
      {hasAllDay && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border-light">
          <div className="flex items-center justify-center border-r border-border-light/50">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-quaternary">
              All day
            </span>
          </div>
          {days.map((day) => {
            const dateKey = formatDateKey(day)
            const dayAllDay = allDayEvents[dateKey] || []
            return (
              <div
                key={dateKey}
                className="min-h-[32px] border-r border-border-light/50 p-1 last:border-r-0"
              >
                {dayAllDay.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className="mb-0.5 w-full truncate rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                    style={{ backgroundColor: event.color || "var(--accent)" }}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="relative max-h-[680px] overflow-y-auto">
        {/* Current time indicator */}
        <CurrentTimeIndicator days={days} />

        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Hour labels */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex items-start justify-end border-r border-border-light/50 pr-2"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="relative -top-2 text-[10px] font-medium text-foreground-quaternary">
                  {hour > 0 ? formatHour(hour) : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dateKey = formatDateKey(day)
            const dayEvents = eventsByDate[dateKey] || []
            const today = isToday(day)

            return (
              <div
                key={dateKey}
                className={cn(
                  "relative border-r border-border-light/50 last:border-r-0",
                  today && "bg-accent-subtle/40"
                )}
              >
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="cursor-pointer border-b border-border-light/40 transition-colors duration-150 hover:bg-accent-subtle/50"
                    style={{ height: HOUR_HEIGHT }}
                    onClick={() => onCreateEvent(dateKey, hour)}
                  />
                ))}

                {/* Events positioned absolutely */}
                {dayEvents.map((event) => {
                  const pos = getEventPosition(event)
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectEvent(event)
                      }}
                      className="absolute left-1 right-1 overflow-hidden rounded-[8px] px-2 py-1 text-left shadow-sm transition-all duration-150 hover:opacity-90 hover:shadow-md"
                      style={{
                        top: pos.top,
                        height: Math.max(pos.height - 2, 22),
                        backgroundColor: event.color || "var(--accent)",
                      }}
                    >
                      <p className="truncate text-[11px] font-semibold leading-tight text-white">
                        {event.title}
                      </p>
                      {pos.height > 40 && (
                        <p className="truncate text-[10px] text-white/80">
                          {new Date(event.startTime).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CurrentTimeIndicator({ days }: { days: Date[] }) {
  const now = new Date()
  const todayIndex = days.findIndex((d) => isToday(d))
  if (todayIndex === -1) return null

  const minutes = now.getHours() * 60 + now.getMinutes()
  const top = (minutes / 60) * HOUR_HEIGHT

  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{
        top,
        left: `calc(60px + ${(todayIndex / 7) * 100}% * 7 / 7)`,
        width: `calc(100% / 7)`,
        marginLeft: `calc(${todayIndex} * (100% - 60px) / 7)`,
      }}
    >
      <div className="relative flex items-center" style={{ left: 0, right: 0 }}>
        <div className="h-3 w-3 rounded-full bg-danger -ml-1.5" />
        <div className="flex-1 h-0.5 bg-danger" />
      </div>
    </div>
  )
}
