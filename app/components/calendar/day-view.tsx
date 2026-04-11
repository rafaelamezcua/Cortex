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

export function DayView({
  date,
  events,
  onCreateEvent,
  onEditEvent,
}: DayViewProps) {
  const d = new Date(date + "T12:00:00")
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" })
  const monthDay = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })

  const allDayEvents = events.filter((e) => e.allDay)
  const timedEvents = events
    .filter((e) => !e.allDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3
            className="text-[20px] font-normal leading-tight tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {weekday}
          </h3>
          <p className="mt-0.5 text-xs text-foreground-tertiary">{monthDay}</p>
        </div>
        <button
          type="button"
          onClick={onCreateEvent}
          aria-label="Add event"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-all duration-150 ease-out hover:border-accent/60 hover:bg-accent-subtle hover:text-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          Add event
        </button>
      </div>

      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-tertiary">
          Nothing scheduled. A clean day.
        </p>
      ) : (
        <div className="space-y-2">
          {/* All-day events */}
          {allDayEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onEditEvent(event)}
              className={cn(
                "group flex w-full items-start gap-3 rounded-[--radius-lg] border border-border-light bg-surface p-3 text-left shadow-sm",
                "transition-all duration-300 ease-out",
                "hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface-raised hover:shadow-md active:translate-y-0"
              )}
            >
              <div
                className="h-full min-h-[40px] w-1 shrink-0 self-stretch rounded-full"
                style={{ backgroundColor: event.color || "var(--accent)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {event.title}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                  All day
                </p>
                {event.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-foreground-tertiary">
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
              type="button"
              onClick={() => onEditEvent(event)}
              className={cn(
                "group flex w-full items-start gap-3 rounded-[--radius-lg] border border-border-light bg-surface p-3 text-left shadow-sm",
                "transition-all duration-300 ease-out",
                "hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface-raised hover:shadow-md active:translate-y-0"
              )}
            >
              <div
                className="h-full min-h-[40px] w-1 shrink-0 self-stretch rounded-full"
                style={{ backgroundColor: event.color || "var(--accent)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {event.title}
                </p>
                <div className="mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-foreground-quaternary" />
                  <p className="text-xs text-foreground-tertiary">
                    {formatEventTime(event.startTime)}{" "}
                    <span className="text-foreground-quaternary">–</span>{" "}
                    {formatEventTime(event.endTime)}
                  </p>
                </div>
                {event.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-foreground-tertiary">
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
