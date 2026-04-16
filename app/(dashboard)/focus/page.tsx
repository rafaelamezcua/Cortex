export const dynamic = "force-dynamic"

import { FocusTimer } from "@/app/components/focus/focus-timer"
import { WeeklyStats } from "@/app/components/focus/weekly-stats"
import { getWeekStats } from "@/lib/actions/focus"
import { getTasks } from "@/lib/actions/tasks"

export default async function FocusPage() {
  const [tasks, stats] = await Promise.all([getTasks(), getWeekStats()])

  const taskOptions = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
  }))

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-10">
      <section className="text-center">
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Focus
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground-secondary">
          Pick a mode and start the clock. The next 25 minutes can belong to
          one thing.
        </p>
      </section>

      <FocusTimer tasks={taskOptions} />

      <WeeklyStats stats={stats} />
    </div>
  )
}
