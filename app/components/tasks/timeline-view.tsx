"use client"

import { cn } from "@/lib/utils"
import { useState, useRef, useTransition } from "react"
import { TaskModal } from "./task-modal"
import { updateTask } from "@/lib/actions/tasks"

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

const TOTAL_DAYS = 28
const PAST_DAYS = 7
const MIN_DRAG_PX = 15 // minimum pixels before drag counts

export function TimelineView({ tasks }: { tasks: Task[] }) {
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const timelineStart = new Date(now)
  timelineStart.setDate(timelineStart.getDate() - PAST_DAYS)

  const days: { date: string; label: string; dayName: string; isToday: boolean; isWeekend: boolean }[] = []
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = new Date(timelineStart)
    d.setDate(d.getDate() + i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    days.push({
      date: dateStr,
      label: d.getDate().toString(),
      dayName: d.toLocaleDateString("en-US", { weekday: "narrow" }),
      isToday: dateStr === todayStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    })
  }

  const tasksWithDates = tasks.filter((t) => t.dueDate || t.createdAt)
  const allDisplayTasks = [
    ...tasksWithDates.filter((t) => t.status !== "done"),
    ...tasksWithDates.filter((t) => t.status === "done"),
  ].slice(0, 25)

  function getBarPosition(task: Task) {
    const created = new Date(task.createdAt)
    const due = task.dueDate
      ? new Date(task.dueDate + "T23:59:59")
      : new Date(created.getTime() + 86400000)

    const startOffset = Math.max(
      0,
      (created.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    const endOffset = Math.min(
      TOTAL_DAYS,
      (due.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
    )

    const dayWidth = 100 / TOTAL_DAYS
    const left = (startOffset / TOTAL_DAYS) * 100
    const width = Math.max(((endOffset - startOffset) / TOTAL_DAYS) * 100, dayWidth)

    return { left: `${left}%`, width: `${width}%` }
  }

  function handleBarMouseDown(e: React.MouseEvent, task: Task) {
    if (!task.dueDate || task.status === "done") return
    e.preventDefault()

    const startX = e.clientX
    let didDrag = false

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = Math.abs(moveEvent.clientX - startX)
      if (delta > MIN_DRAG_PX) {
        didDrag = true
        // Visual feedback
        if (!containerRef.current) return
        const containerWidth = containerRef.current.offsetWidth - 160
        const pixelsPerDay = containerWidth / TOTAL_DAYS
        const deltaDays = Math.round((moveEvent.clientX - startX) / pixelsPerDay)

        const bar = document.querySelector(`[data-task-bar="${task.id}"]`) as HTMLElement
        if (bar && deltaDays !== 0) {
          const origDate = new Date(task.dueDate! + "T12:00:00")
          origDate.setDate(origDate.getDate() + deltaDays)
          const tempTask = { ...task, dueDate: `${origDate.getFullYear()}-${String(origDate.getMonth() + 1).padStart(2, "0")}-${String(origDate.getDate()).padStart(2, "0")}` }
          const pos = getBarPosition(tempTask)
          bar.style.left = pos.left
          bar.style.width = pos.width
        }
      }
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)

      if (!didDrag) {
        // It was a click, not a drag — open modal
        setEditingTask(task)
        return
      }

      if (!containerRef.current) return
      const containerWidth = containerRef.current.offsetWidth - 160
      const pixelsPerDay = containerWidth / TOTAL_DAYS
      const deltaDays = Math.round((upEvent.clientX - startX) / pixelsPerDay)

      if (deltaDays !== 0) {
        const origDate = new Date(task.dueDate! + "T12:00:00")
        origDate.setDate(origDate.getDate() + deltaDays)
        const newDate = `${origDate.getFullYear()}-${String(origDate.getMonth() + 1).padStart(2, "0")}-${String(origDate.getDate()).padStart(2, "0")}`

        startTransition(async () => {
          const formData = new FormData()
          formData.set("title", task.title)
          formData.set("description", task.description || "")
          formData.set("priority", task.priority)
          formData.set("dueDate", newDate)
          await updateTask(task.id, formData)
        })
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
  }

  if (allDisplayTasks.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground-tertiary">
        No tasks with dates. Add due dates to see the timeline.
      </p>
    )
  }

  const todayIndex = days.findIndex((d) => d.isToday)

  return (
    <>
      <div
        ref={containerRef}
        className="rounded-[--radius-xl] border border-border-light/60 bg-surface shadow-sm overflow-x-auto select-none"
      >
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b border-border-light/40">
            <div className="w-40 shrink-0 border-r border-border-light/40 px-3 py-2.5 flex items-end">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                Task
              </span>
            </div>
            <div className="flex-1 flex">
              {days.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    "flex-1 text-center py-1.5 border-r border-border-light/20 last:border-r-0",
                    day.isToday && "bg-accent/8",
                    day.isWeekend && !day.isToday && "bg-background-secondary/40"
                  )}
                >
                  <span className={cn(
                    "text-[9px] block",
                    day.isToday ? "text-accent font-bold" : "text-foreground-quaternary"
                  )}>
                    {day.dayName}
                  </span>
                  <span className={cn(
                    "text-[11px] font-medium",
                    day.isToday
                      ? "bg-accent text-white rounded-full inline-flex h-5 w-5 items-center justify-center"
                      : "text-foreground-tertiary"
                  )}>
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          {allDisplayTasks.map((task) => {
            const pos = getBarPosition(task)
            const isDone = task.status === "done"
            const hasDueDate = !!task.dueDate

            return (
              <div
                key={task.id}
                className="flex border-b border-border-light/20 last:border-b-0 group"
              >
                <div
                  className="w-40 shrink-0 border-r border-border-light/40 px-3 py-3 flex items-center gap-2 cursor-pointer hover:bg-surface-hover/50 transition-colors"
                  onClick={() => setEditingTask(task)}
                >
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: priorityColors[task.priority] }}
                  />
                  <span className={cn(
                    "text-xs font-medium truncate",
                    isDone && "line-through text-foreground-tertiary"
                  )}>
                    {task.title}
                  </span>
                </div>

                <div className="flex-1 relative py-2">
                  {todayIndex >= 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-accent/40 z-[5]"
                      style={{ left: `${((todayIndex + 0.5) / TOTAL_DAYS) * 100}%` }}
                    />
                  )}

                  <div
                    data-task-bar={task.id}
                    className={cn(
                      "absolute top-2 h-6 rounded-full transition-opacity",
                      isDone && "opacity-40",
                      hasDueDate && !isDone ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                    )}
                    style={{
                      left: pos.left,
                      width: pos.width,
                      backgroundColor: statusColors[task.status] || "var(--accent)",
                    }}
                    onMouseDown={(e) => handleBarMouseDown(e, task)}
                  >
                    <span className="absolute inset-0 flex items-center px-2 text-[9px] font-semibold text-white truncate pointer-events-none">
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
