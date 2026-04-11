export const dynamic = "force-dynamic"

import { getHabits, getHabitLogs } from "@/lib/actions/habits"
import { HabitTracker } from "@/app/components/habits/habit-tracker"
import { HabitForm } from "@/app/components/habits/habit-form"

function composeHabitsLine(
  habitCount: number,
  doneToday: number
): string {
  if (habitCount === 0) {
    return "Pick one small thing to repeat. Growth is made here."
  }
  if (doneToday === 0) {
    return habitCount === 1
      ? "One habit to track. Nothing logged yet today."
      : `${habitCount} habits to track. Nothing logged yet today.`
  }
  if (doneToday === habitCount) {
    return habitCount === 1
      ? "Today's done. Come back tomorrow."
      : `All ${habitCount} done today. Earned it.`
  }
  return `${doneToday} of ${habitCount} done today. Keep going.`
}

export default async function HabitsPage() {
  const habits = await getHabits()

  // Get logs for the last 30 days
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const startDate = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(thirtyDaysAgo.getDate()).padStart(2, "0")}`
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const logs = await getHabitLogs(startDate, endDate)

  // Count habits completed today
  const todayLogMap = new Map<string, number>()
  for (const log of logs) {
    if (log.date === endDate) {
      todayLogMap.set(log.habitId, log.count)
    }
  }
  const doneToday = habits.filter(
    (h) => (todayLogMap.get(h.id) || 0) >= h.targetPerDay
  ).length

  const habitsLine = composeHabitsLine(habits.length, doneToday)

  return (
    <div className="space-y-8">
      <section>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Habits
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground-secondary">
          {habitsLine}
        </p>
      </section>

      <HabitForm />
      <HabitTracker habits={habits} logs={logs} todayStr={endDate} />
    </div>
  )
}
