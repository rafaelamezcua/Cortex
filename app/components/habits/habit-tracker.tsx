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
      <div className="flex flex-col items-center justify-center rounded-[--radius-xl] border border-dashed border-border py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-light">
          <Flame className="h-7 w-7 text-accent" />
        </div>
        <p className="mb-1 text-sm font-medium text-foreground-secondary">
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
            className={cn(
              "group rounded-[--radius-xl] border border-border-light bg-surface p-5 shadow-sm",
              "transition-all duration-300 ease-out",
              "hover:border-accent/25 hover:bg-surface-raised hover:shadow-md"
            )}
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[--radius-md] text-lg text-white shadow-sm"
                  style={{ backgroundColor: habit.color }}
                >
                  {habit.icon || habit.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold text-foreground">
                    {habit.name}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    {streak > 0 ? (
                      <span className="flex items-center gap-1 font-medium text-warning">
                        <Flame className="h-3 w-3" />
                        {streak} day streak
                      </span>
                    ) : (
                      <span className="font-medium text-foreground-quaternary">
                        No streak yet
                      </span>
                    )}
                    <span className="text-foreground-quaternary">·</span>
                    <span className="capitalize text-foreground-quaternary">
                      {habit.frequency}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Delete button — hover reveal */}
                <button
                  type="button"
                  onClick={() => startTransition(() => deleteHabit(habit.id))}
                  aria-label="Delete habit"
                  className="rounded-[--radius-sm] p-1.5 text-foreground-quaternary opacity-0 transition-all duration-150 hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* Today's toggle — the ring */}
                <button
                  type="button"
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
                  aria-label={completed ? "Mark today incomplete" : "Log for today"}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-200",
                    completed
                      ? "border-success bg-success text-white shadow-sm"
                      : "border-foreground-quaternary hover:border-accent hover:bg-accent/10 active:scale-95"
                  )}
                >
                  {completed ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    <Plus className="h-5 w-5 text-foreground-tertiary" />
                  )}
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
                    type="button"
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
                    title={`${day}${count > 0 ? `, ${count}x` : ""}`}
                    className={cn(
                      "h-5 flex-1 rounded-[4px] transition-all duration-150 hover:scale-y-110 hover:opacity-100",
                      isToday &&
                        "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                      count > 0 ? "opacity-100" : "bg-background-tertiary opacity-50"
                    )}
                    style={count > 0 ? { backgroundColor: habit.color } : undefined}
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
