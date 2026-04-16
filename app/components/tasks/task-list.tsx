"use client"

import { TaskItem } from "./task-item"
import { TaskModal } from "./task-modal"
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
  recurrence?: string | null
  parentId?: string | null
  isTemplate?: boolean | null
}

type Filter = "all" | "active" | "done"

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "done", label: "Done" },
]

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<Filter>("all")
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Split top-level tasks and subtasks.
  const roots = tasks.filter((t) => !t.parentId)
  const childrenByParent = new Map<string, Task[]>()
  for (const t of tasks) {
    if (t.parentId) {
      const arr = childrenByParent.get(t.parentId) ?? []
      arr.push(t)
      childrenByParent.set(t.parentId, arr)
    }
  }

  const filtered = roots.filter((t) => {
    if (filter === "active") return t.status !== "done"
    if (filter === "done") return t.status === "done"
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 rounded-[--radius-md] bg-background-secondary p-1 w-fit">
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
          filtered.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              subtasks={childrenByParent.get(task.id) ?? []}
              onClick={() => setEditingTask(task)}
            />
          ))
        )}
      </div>

      {/* Edit modal */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          subtasks={childrenByParent.get(editingTask.id) ?? []}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}
