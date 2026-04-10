import { CalendarView } from "@/app/components/calendar/calendar-view"
import { getEventsForRange } from "@/lib/actions/calendar"

export default async function CalendarPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const start = `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}T23:59:59`

  const events = await getEventsForRange(start, end)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Manage your schedule.
        </p>
      </div>

      <CalendarView initialEvents={events} />
    </div>
  )
}
