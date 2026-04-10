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

  // Pad start with nulls
  for (let i = 0; i < firstDayOfWeek; i++) {
    grid.push(null)
  }

  grid.push(...days)

  // Pad end to complete the last week
  while (grid.length % 7 !== 0) {
    grid.push(null)
  }

  return grid
}

export function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function isSameDay(a: Date, b: Date): boolean {
  return formatDateKey(a) === formatDateKey(b)
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
