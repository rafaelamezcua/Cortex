"use client"

import { cn } from "@/lib/utils"
import { getCalendarGrid, isToday, formatDateKey, getMonthName } from "@/lib/calendar-utils"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useState, useTransition } from "react"
import { createLocalCalendar, deleteLocalCalendar } from "@/lib/actions/local-calendars"
import { Download, Trash2 } from "lucide-react"

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

          {/* All calendars */}
          {calendars.map((cal) => {
            const isLocalCal = cal.id.startsWith("local-")
            return (
              <div key={cal.id} className="group flex items-center">
                <button
                  onClick={() => onToggleCalendar(cal.id)}
                  className="flex flex-1 items-center gap-2.5 rounded-[--radius-md] px-2 py-2 text-sm transition-colors hover:bg-surface-hover"
                >
                  <div
                    className="flex h-4 w-4 items-center justify-center rounded border-2 transition-colors"
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
                {/* Actions — export + delete for local */}
                <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={`/api/calendar/export?calendarId=${encodeURIComponent(cal.id)}&name=${encodeURIComponent(cal.summary)}`}
                    className="rounded p-1 text-foreground-quaternary hover:text-accent transition-colors"
                    title="Export .ics"
                  >
                    <Download className="h-3 w-3" />
                  </a>
                  {isLocalCal && (
                    <DeleteCalButton calId={cal.id.replace("local-", "")} />
                  )}
                </div>
              </div>
            )
          })}
          {/* Create new calendar */}
          <CreateCalendarButton onCreated={(id) => onToggleCalendar(id)} />
        </div>
      </div>
    </div>
  )
}

function DeleteCalButton({ calId }: { calId: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      disabled={isPending}
      onClick={(e) => {
        e.stopPropagation()
        if (confirm("Delete this calendar?")) {
          startTransition(() => deleteLocalCalendar(calId))
        }
      }}
      className="rounded p-1 text-foreground-quaternary hover:text-danger transition-colors disabled:opacity-50"
      title="Delete calendar"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  )
}

const calColors = [
  "#7986cb", "#33b679", "#8e24aa", "#e67c73",
  "#f6bf26", "#f4511e", "#039be5", "#616161",
]

function CreateCalendarButton({ onCreated }: { onCreated: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState("")
  const [color, setColor] = useState(calColors[0])
  const [isPending, startTransition] = useTransition()

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-2 rounded-[--radius-md] px-2 py-2 text-xs text-foreground-tertiary transition-colors hover:bg-surface-hover hover:text-accent"
      >
        <Plus className="h-3.5 w-3.5" />
        New calendar
      </button>
    )
  }

  return (
    <div className="rounded-[--radius-md] border border-border-light bg-background p-2.5 space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Calendar name"
        autoFocus
        className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-foreground-quaternary"
      />
      <div className="flex gap-1.5">
        {calColors.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={cn(
              "h-5 w-5 rounded-full transition-transform",
              color === c && "scale-125 ring-2 ring-offset-1 ring-offset-background"
            )}
            style={{ backgroundColor: c, "--tw-ring-color": c } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => { setIsOpen(false); setName("") }}
          className="flex-1 rounded px-2 py-1 text-[11px] text-foreground-tertiary hover:bg-surface-hover"
        >
          Cancel
        </button>
        <button
          disabled={!name.trim() || isPending}
          onClick={() => {
            startTransition(async () => {
              const id = await createLocalCalendar(name.trim(), color)
              onCreated(`local-${id}`)
              setIsOpen(false)
              setName("")
            })
          }}
          className="flex-1 rounded bg-accent px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
        >
          Create
        </button>
      </div>
    </div>
  )
}
