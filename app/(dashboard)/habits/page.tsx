export const dynamic = "force-dynamic"

import { getHabits, getHabitLogs } from "@/lib/actions/habits"
import { HabitTracker } from "@/app/components/habits/habit-tracker"
import { HabitForm } from "@/app/components/habits/habit-form"

export default async function HabitsPage() {
  const habits = await getHabits()

  // Get logs for the last 30 days
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const startDate = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(thirtyDaysAgo.getDate()).padStart(2, "0")}`
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const logs = await getHabitLogs(startDate, endDate)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Build consistency, track your streaks.
        </p>
      </div>

      <HabitForm />
      <HabitTracker habits={habits} logs={logs} todayStr={endDate} />
    </div>
  )
}
