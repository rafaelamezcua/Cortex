"use client"

import { cn } from "@/lib/utils"
import { getCalendarGrid, isToday, formatDateKey, getMonthName } from "@/lib/calendar-utils"
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react"
import { useState } from "react"

interface CalendarInfo {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

interface CalendarSidebarProps {
  calendars: CalendarInfo[]
  enabledCalendars: Set<string>
  onToggleCalendar: (id: string) => void
  year: number
  month: number
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onNavigateMonth: (year: number, month: number) => void
}

export function CalendarSidebar({
  calendars,
  enabledCalendars,
  onToggleCalendar,
  year,
  month,
  selectedDate,
  onSelectDate,
  onNavigateMonth,
}: CalendarSidebarProps) {
  // Mini month navigator — show a different month than the main view
  const [miniYear, setMiniYear] = useState(year)
  const [miniMonth, setMiniMonth] = useState(month)

  const grid = getCalendarGrid(miniYear, miniMonth)
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"]

  function prevMiniMonth() {
    if (miniMonth === 0) {
      setMiniMonth(11)
      setMiniYear(miniYear - 1)
    } else {
      setMiniMonth(miniMonth - 1)
    }
  }

  function nextMiniMonth() {
    if (miniMonth === 11) {
      setMiniMonth(0)
      setMiniYear(miniYear + 1)
    } else {
      setMiniMonth(miniMonth + 1)
    }
  }

  function handleSelectDate(date: string) {
    onSelectDate(date)
    // Navigate main view to match
    const d = new Date(date + "T12:00:00")
    onNavigateMonth(d.getFullYear(), d.getMonth())
  }

  return (
    <div className="space-y-6">
      {/* Mini month navigator */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-foreground">
            {getMonthName(miniMonth)} {miniYear}
          </span>
          <div className="flex gap-0.5">
            <button
              onClick={prevMiniMonth}
              className="flex h-6 w-6 items-center justify-center rounded text-foreground-tertiary hover:bg-surface-hover"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={nextMiniMonth}
              className="flex h-6 w-6 items-center justify-center rounded text-foreground-tertiary hover:bg-surface-hover"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-0.5">
          {weekdays.map((day, i) => (
            <div
              key={i}
              className="text-center text-[10px] font-medium text-foreground-quaternary py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Mini grid */}
        <div className="grid grid-cols-7">
          {grid.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} className="h-7" />
            }
            const dateKey = formatDateKey(date)
            const today = isToday(date)
            const isSelected = selectedDate === dateKey

            return (
              <button
                key={dateKey}
                onClick={() => handleSelectDate(dateKey)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all duration-150 mx-auto",
                  today && !isSelected && "bg-accent text-white font-semibold",
                  isSelected && "bg-accent text-white font-semibold ring-2 ring-accent/30",
                  !today && !isSelected && "text-foreground hover:bg-surface-hover"
                )}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Calendar list */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary mb-3">
          My Calendars
        </h3>
        <div className="space-y-1">
          {/* Local calendar */}
          <button
            onClick={() => onToggleCalendar("local")}
            className="flex w-full items-center gap-2.5 rounded-[--radius-md] px-2 py-2 text-sm transition-colors hover:bg-surface-hover"
          >
            <div
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded border-2 transition-colors",
                enabledCalendars.has("local")
                  ? "border-accent bg-accent"
                  : "border-foreground-quaternary"
              )}
            >
              {enabledCalendars.has("local") && (
                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-[13px] text-foreground">Luma (Local)</span>
          </button>

          {/* Google calendars */}
          {calendars.map((cal) => (
            <button
              key={cal.id}
              onClick={() => onToggleCalendar(cal.id)}
              className="flex w-full items-center gap-2.5 rounded-[--radius-md] px-2 py-2 text-sm transition-colors hover:bg-surface-hover"
            >
              <div
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border-2 transition-colors"
                )}
                style={{
                  borderColor: enabledCalendars.has(cal.id)
                    ? cal.backgroundColor
                    : "var(--foreground-quaternary)",
                  backgroundColor: enabledCalendars.has(cal.id)
                    ? cal.backgroundColor
                    : "transparent",
                }}
              >
                {enabledCalendars.has(cal.id) && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-[13px] text-foreground truncate">
                {cal.summary}
                {cal.primary && (
                  <span className="ml-1 text-foreground-quaternary">(primary)</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
