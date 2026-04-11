"use client"

import { CalendarView } from "./calendar-view"

export function CalendarPage() {
  return (
    <div className="space-y-8">
      <section>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Calendar
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground-secondary">
          Your month, laid out plainly. Click any day to see what&apos;s there.
        </p>
      </section>

      <CalendarView initialEvents={[]} />
    </div>
  )
}
