export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

export function getCalendarGrid(year: number, month: number): (Date | null)[] {
  const days = getDaysInMonth(year, month)
  const firstDayOfWeek = days[0].getDay()
  const grid: (Date | null)[] = []

  for (let i = 0; i < firstDayOfWeek; i++) {
    grid.push(null)
  }

  grid.push(...days)

  while (grid.length % 7 !== 0) {
    grid.push(null)
  }

  return grid
}

// Use LOCAL date, not UTC — this was causing the wrong day to highlight
export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function getTodayKey(): string {
  return formatDateKey(new Date())
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function formatEventTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function getMonthName(month: number): string {
  return new Date(2024, month).toLocaleString("en-US", { month: "long" })
}
