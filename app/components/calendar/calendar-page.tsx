"use client"

import { CalendarView } from "./calendar-view"

export function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Manage your schedule.
        </p>
      </div>

      <CalendarView initialEvents={[]} />
    </div>
  )
}
