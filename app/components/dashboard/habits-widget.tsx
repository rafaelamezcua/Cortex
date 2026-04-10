"use client"

import { Card } from "@/app/components/ui/card"
import { Flame, Check, Plus, ArrowRight } from "lucide-react"
import { logHabit, unlogHabit } from "@/lib/actions/habits"
import { useTransition } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"

type Habit = {
  id: string
  name: string
  icon: string | null
  color: string
  targetPerDay: number
}

type HabitLog = {
  habitId: string
  date: string
  count: number
}

interface HabitsWidgetProps {
  habits: Habit[]
  todayLogs: HabitLog[]
  todayStr: string
}

export function HabitsWidget({ habits, todayLogs, todayStr }: HabitsWidgetProps) {
  const [isPending, startTransition] = useTransition()

  if (habits.length === 0) {
    return (
      <Link href="/habits">
        <Card variant="interactive" className="col-span-1 h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-accent-light">
                <Flame className="h-5 w-5 text-accent" />
              </div>
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground-tertiary">
                Habits
              </h2>
            </div>
            <ArrowRight className="h-4 w-4 text-foreground-quaternary" />
          </div>
          <p className="text-sm text-foreground-tertiary">Start tracking habits</p>
        </Card>
      </Link>
    )
  }

  const logMap = new Map<string, number>()
  for (const log of todayLogs) {
    logMap.set(log.habitId, log.count)
  }

  const completed = habits.filter(
    (h) => (logMap.get(h.id) || 0) >= h.targetPerDay
  ).length

  return (
    <Card className="col-span-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-accent-light">
            <Flame className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground-tertiary">
              Habits
            </h2>
            <p className="text-xs text-foreground-quaternary">
              {completed}/{habits.length} today
            </p>
          </div>
        </div>
        <Link href="/habits">
          <ArrowRight className="h-4 w-4 text-foreground-quaternary hover:text-accent transition-colors" />
        </Link>
      </div>

      <div className="space-y-2">
        {habits.slice(0, 4).map((habit) => {
          const count = logMap.get(habit.id) || 0
          const done = count >= habit.targetPerDay

          return (
            <button
              key={habit.id}
              onClick={() =>
                startTransition(() => {
                  if (done) unlogHabit(habit.id, todayStr)
                  else logHabit(habit.id, todayStr)
                })
              }
              disabled={isPending}
              className="flex w-full items-center gap-2.5 rounded-[--radius-md] p-1.5 -mx-1.5 transition-colors hover:bg-surface-hover"
            >
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all text-xs",
                  done
                    ? "border-transparent text-white"
                    : "border-foreground-quaternary"
                )}
                style={done ? { backgroundColor: habit.color } : undefined}
              >
                {done ? <Check className="h-3 w-3" /> : null}
              </div>
              <span className={cn("text-sm flex-1 text-left", done && "line-through text-foreground-tertiary")}>
                {habit.icon && <span className="mr-1">{habit.icon}</span>}
                {habit.name}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
