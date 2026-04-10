"use client"

import { TaskItem } from "./task-item"
import { useState } from "react"
import { cn } from "@/lib/utils"

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

type Filter = "all" | "active" | "done"

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "done", label: "Done" },
]

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = tasks.filter((t) => {
    if (filter === "active") return t.status !== "done"
    if (filter === "done") return t.status === "done"
    return true
  })

  const activeCount = tasks.filter((t) => t.status !== "done").length

  return (
    <div className="space-y-4">
      {/* Filter tabs + count */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-[--radius-md] bg-background-secondary p-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-[--radius-sm] px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                filter === f.value
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-tertiary hover:text-foreground-secondary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-foreground-tertiary">
          {activeCount} active
        </span>
      </div>

      {/* Task items */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground-tertiary">
            {filter === "done"
              ? "No completed tasks yet"
              : filter === "active"
                ? "All caught up!"
                : "No tasks yet. Add one above."}
          </p>
        ) : (
          filtered.map((task) => <TaskItem key={task.id} task={task} />)
        )}
      </div>
    </div>
  )
}
