"use client"

import { cn } from "@/lib/utils"
import { logHabit, unlogHabit, deleteHabit } from "@/lib/actions/habits"
import { Check, Flame, Trash2, Plus } from "lucide-react"
import { useTransition, useState } from "react"
import { Button } from "@/app/components/ui/button"

type Habit = {
  id: string
  name: string
  icon: string | null
  color: string
  frequency: string
  targetPerDay: number
  createdAt: string
}

type HabitLog = {
  id: string
  habitId: string
  date: string
  count: number
}

interface HabitTrackerProps {
  habits: Habit[]
  logs: HabitLog[]
  todayStr: string
}

const STREAK_DAYS = 30

export function HabitTracker({ habits, logs, todayStr }: HabitTrackerProps) {
  const [isPending, startTransition] = useTransition()

  // Build log lookup
  const logMap = new Map<string, number>()
  for (const log of logs) {
    logMap.set(`${log.habitId}:${log.date}`, log.count)
  }

  // Generate last N days
  const days: string[] = []
  for (let i = STREAK_DAYS - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    )
  }

  // Calculate streaks
  function getStreak(habitId: string): number {
    let streak = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const count = logMap.get(`${habitId}:${dateStr}`) || 0
      if (count > 0) {
        streak++
      } else if (i === 0) {
        // Today not done yet, keep checking
        continue
      } else {
        break
      }
    }
    return streak
  }

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-light mb-4">
          <Flame className="h-7 w-7 text-accent" />
        </div>
        <p className="text-sm text-foreground-tertiary mb-1">
          No habits tracked yet
        </p>
        <p className="text-xs text-foreground-quaternary">
          Add your first habit above to start building streaks.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {habits.map((habit) => {
        const streak = getStreak(habit.id)
        const todayCount = logMap.get(`${habit.id}:${todayStr}`) || 0
        const completed = todayCount >= habit.targetPerDay

        return (
          <div
            key={habit.id}
            className="rounded-[--radius-xl] border border-border-light/60 bg-surface p-5 shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] text-white text-lg"
                  style={{ backgroundColor: habit.color }}
                >
                  {habit.icon || habit.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {habit.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {streak > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-warning">
                        <Flame className="h-3 w-3" />
                        {streak} day streak
                      </span>
                    )}
                    <span className="text-xs text-foreground-quaternary capitalize">
                      {habit.frequency}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Today's toggle */}
                <button
                  onClick={() =>
                    startTransition(() => {
                      if (completed) {
                        unlogHabit(habit.id, todayStr)
                      } else {
                        logHabit(habit.id, todayStr)
                      }
                    })
                  }
                  disabled={isPending}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200",
                    completed
                      ? "border-success bg-success text-white"
                      : "border-foreground-quaternary hover:border-accent hover:bg-accent/5"
                  )}
                >
                  {completed ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Plus className="h-5 w-5 text-foreground-quaternary" />
                  )}
                </button>

                <button
                  onClick={() => startTransition(() => deleteHabit(habit.id))}
                  className="rounded-[--radius-sm] p-1.5 text-foreground-quaternary opacity-0 hover:bg-danger/10 hover:text-danger transition-all group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Streak grid — last 30 days */}
            <div className="flex gap-[3px]">
              {days.map((day) => {
                const count = logMap.get(`${habit.id}:${day}`) || 0
                const isToday = day === todayStr

                return (
                  <button
                    key={day}
                    onClick={() =>
                      startTransition(() => {
                        if (count > 0) {
                          unlogHabit(habit.id, day)
                        } else {
                          logHabit(habit.id, day)
                        }
                      })
                    }
                    disabled={isPending}
                    className={cn(
                      "h-4 flex-1 rounded-[3px] transition-all duration-150",
                      isToday && "ring-1 ring-accent ring-offset-1 ring-offset-surface",
                      count > 0
                        ? "opacity-100"
                        : "bg-background-tertiary opacity-40"
                    )}
                    style={
                      count > 0
                        ? { backgroundColor: habit.color }
                        : undefined
                    }
                    title={`${day}${count > 0 ? ` — ${count}x` : ""}`}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
