"use client"

import { cn } from "@/lib/utils"
import { formatEventTime } from "@/lib/calendar-utils"
import { Clock, Plus } from "lucide-react"

type CalendarEvent = {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  color: string | null
  allDay: boolean
}

interface DayViewProps {
  date: string
  events: CalendarEvent[]
  onCreateEvent: () => void
  onEditEvent: (event: CalendarEvent) => void
}

export function DayView({ date, events, onCreateEvent, onEditEvent }: DayViewProps) {
  const d = new Date(date + "T12:00:00")
  const dateLabel = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const allDayEvents = events.filter((e) => e.allDay)
  const timedEvents = events
    .filter((e) => !e.allDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{dateLabel}</h3>
        <button
          onClick={onCreateEvent}
          className="flex items-center gap-1.5 rounded-[--radius-md] px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent-light"
        >
          <Plus className="h-3.5 w-3.5" />
          Add event
        </button>
      </div>

      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-foreground-tertiary">
          No events scheduled
        </p>
      ) : (
        <div className="space-y-2">
          {/* All-day events */}
          {allDayEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEditEvent(event)}
              className="flex w-full items-center gap-3 rounded-[--radius-md] border border-border-light p-3 text-left transition-colors hover:bg-surface-hover"
            >
              <div
                className="h-full w-1 shrink-0 self-stretch rounded-full"
                style={{ backgroundColor: event.color || "#0071e3" }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {event.title}
                </p>
                <p className="text-xs text-foreground-tertiary">All day</p>
                {event.description && (
                  <p className="mt-1 text-xs text-foreground-quaternary line-clamp-1">
                    {event.description}
                  </p>
                )}
              </div>
            </button>
          ))}

          {/* Timed events */}
          {timedEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEditEvent(event)}
              className="flex w-full items-center gap-3 rounded-[--radius-md] border border-border-light p-3 text-left transition-colors hover:bg-surface-hover"
            >
              <div
                className="h-full w-1 shrink-0 self-stretch rounded-full"
                style={{ backgroundColor: event.color || "#0071e3" }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {event.title}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3 text-foreground-quaternary" />
                  <p className="text-xs text-foreground-tertiary">
                    {formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}
                  </p>
                </div>
                {event.description && (
                  <p className="mt-1 text-xs text-foreground-quaternary line-clamp-1">
                    {event.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
