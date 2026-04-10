"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"
import { TaskModal } from "./task-modal"

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  order: number
  createdAt: string
  updatedAt: string
}

const priorityColors: Record<string, string> = {
  low: "#aeaeb2",
  medium: "#ff9f0a",
  high: "#ff453a",
}

const statusColors: Record<string, string> = {
  todo: "var(--foreground-quaternary)",
  in_progress: "var(--accent)",
  done: "var(--success)",
}

export function TimelineView({ tasks }: { tasks: Task[] }) {
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  // Timeline spans from 7 days ago to 21 days ahead (28 days total)
  const timelineStart = new Date(now)
  timelineStart.setDate(timelineStart.getDate() - 7)
  const timelineEnd = new Date(now)
  timelineEnd.setDate(timelineEnd.getDate() + 21)

  const totalDays = 28
  const dayWidth = 100 / totalDays

  // Generate day labels
  const days: { date: string; label: string; isToday: boolean; isWeekend: boolean }[] = []
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(timelineStart)
    d.setDate(d.getDate() + i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    days.push({
      date: dateStr,
      label: d.getDate().toString(),
      isToday: dateStr === todayStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    })
  }

  // Week labels
  const weeks: { label: string; span: number; startIdx: number }[] = []
  let currentWeek = ""
  for (let i = 0; i < days.length; i++) {
    const d = new Date(days[i].date + "T12:00:00")
    const weekLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const weekKey = `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}-${d.getMonth()}`
    if (weekKey !== currentWeek) {
      weeks.push({ label: weekLabel, span: 1, startIdx: i })
      currentWeek = weekKey
    } else {
      weeks[weeks.length - 1].span++
    }
  }

  // Filter tasks with dates for the bar chart
  const tasksWithDates = tasks.filter((t) => t.dueDate || t.createdAt)
  const activeTasks = tasksWithDates.filter((t) => t.status !== "done")
  const doneTasks = tasksWithDates.filter((t) => t.status === "done")

  function getBarPosition(task: Task) {
    const created = new Date(task.createdAt)
    const due = task.dueDate ? new Date(task.dueDate + "T23:59:59") : new Date(created.getTime() + 86400000)

    const startOffset = Math.max(
      0,
      (created.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    const endOffset = Math.min(
      totalDays,
      (due.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
    )

    const left = (startOffset / totalDays) * 100
    const width = Math.max(((endOffset - startOffset) / totalDays) * 100, dayWidth)

    return { left: `${left}%`, width: `${width}%` }
  }

  const allDisplayTasks = [...activeTasks, ...doneTasks].slice(0, 20)

  if (allDisplayTasks.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground-tertiary">
        No tasks with dates to display. Add due dates to see the timeline.
      </p>
    )
  }

  return (
    <>
      <div className="rounded-[--radius-xl] border border-border-light/60 bg-surface shadow-sm overflow-x-auto">
        {/* Header — day columns */}
        <div className="min-w-[800px]">
          {/* Day numbers */}
          <div className="flex border-b border-border-light/40">
            <div className="w-40 shrink-0 border-r border-border-light/40 px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                Task
              </span>
            </div>
            <div className="flex-1 flex">
              {days.map((day, i) => (
                <div
                  key={day.date}
                  className={cn(
                    "flex-1 text-center py-2 text-[10px] border-r border-border-light/20 last:border-r-0",
                    day.isToday && "bg-accent/10 font-bold text-accent",
                    day.isWeekend && !day.isToday && "bg-background-secondary/50",
                    !day.isToday && !day.isWeekend && "text-foreground-quaternary"
                  )}
                >
                  {day.label}
                </div>
              ))}
            </div>
          </div>

          {/* Task rows with bars */}
          {allDisplayTasks.map((task) => {
            const pos = getBarPosition(task)
            const isDone = task.status === "done"

            return (
              <div
                key={task.id}
                className="flex border-b border-border-light/20 last:border-b-0 hover:bg-surface-hover/50 transition-colors cursor-pointer"
                onClick={() => setEditingTask(task)}
              >
                {/* Task name */}
                <div className="w-40 shrink-0 border-r border-border-light/40 px-3 py-3 flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: priorityColors[task.priority] }}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium truncate",
                      isDone && "line-through text-foreground-tertiary"
                    )}
                  >
                    {task.title}
                  </span>
                </div>

                {/* Bar area */}
                <div className="flex-1 relative py-2">
                  {/* Today indicator */}
                  {days.map((day) =>
                    day.isToday ? (
                      <div
                        key="today-line"
                        className="absolute top-0 bottom-0 w-px bg-accent z-10"
                        style={{
                          left: `${((days.indexOf(day) + 0.5) / totalDays) * 100}%`,
                        }}
                      />
                    ) : null
                  )}

                  {/* Task bar */}
                  <div
                    className={cn(
                      "absolute top-2.5 h-5 rounded-full transition-all duration-200 hover:opacity-80",
                      isDone && "opacity-50"
                    )}
                    style={{
                      left: pos.left,
                      width: pos.width,
                      backgroundColor: statusColors[task.status] || "var(--accent)",
                    }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white truncate px-2">
                      {task.title}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {editingTask && (
        <TaskModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}
    </>
  )
}
