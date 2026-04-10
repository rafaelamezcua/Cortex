"use client"

import { cn } from "@/lib/utils"
import { addProjectTask, updateProjectTask, deleteProjectTask } from "@/lib/actions/projects"
import { Check, Trash2, Plus } from "lucide-react"
import { useState, useTransition } from "react"

type ProjectTask = {
  id: string
  projectId: string
  title: string
  description: string | null
  status: string
  order: number
}

interface ProjectBoardProps {
  projectId: string
  projectColor: string
  tasks: ProjectTask[]
}

const columns = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
]

export function ProjectBoard({ projectId, projectColor, tasks }: ProjectBoardProps) {
  const [isPending, startTransition] = useTransition()
  const [newTask, setNewTask] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {columns.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.key)

        return (
          <div key={col.key} className="space-y-3">
            {/* Column header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      col.key === "done"
                        ? "var(--success)"
                        : col.key === "in_progress"
                          ? projectColor
                          : "var(--foreground-quaternary)",
                  }}
                />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                  {col.label}
                </h3>
                <span className="text-[11px] text-foreground-quaternary">
                  {columnTasks.length}
                </span>
              </div>
              {col.key === "todo" && (
                <button
                  onClick={() => setNewTask(col.key)}
                  className="rounded p-1 text-foreground-quaternary hover:text-accent transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Tasks */}
            <div className="space-y-2 min-h-[80px]">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "group rounded-[--radius-lg] border border-border-light/60 bg-surface p-3 transition-all duration-200 hover:shadow-sm",
                    isPending && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-medium flex-1", task.status === "done" && "line-through text-foreground-tertiary")}>
                      {task.title}
                    </p>
                    <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {task.status !== "done" && (
                        <button
                          onClick={() =>
                            startTransition(() =>
                              updateProjectTask(task.id, {
                                status: task.status === "todo" ? "in_progress" : "done",
                              })
                            )
                          }
                          className="rounded p-1 text-foreground-quaternary hover:text-accent transition-colors"
                          title="Advance status"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => startTransition(() => deleteProjectTask(task.id))}
                        className="rounded p-1 text-foreground-quaternary hover:text-danger transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Inline add */}
              {newTask === col.key && (
                <form
                  action={(formData) => {
                    const title = formData.get("title") as string
                    if (title?.trim()) {
                      startTransition(() => addProjectTask(projectId, title))
                    }
                    setNewTask(null)
                  }}
                  className="rounded-[--radius-lg] border border-border-light/60 bg-surface p-3"
                >
                  <input
                    name="title"
                    placeholder="Task name..."
                    autoFocus
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-quaternary"
                    onBlur={(e) => {
                      if (!e.currentTarget.value.trim()) setNewTask(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setNewTask(null)
                    }}
                  />
                </form>
              )}
            </div>

            {/* Add button at bottom */}
            {col.key !== "todo" && newTask !== col.key && (
              <button
                onClick={() => setNewTask(col.key)}
                className="flex w-full items-center gap-1.5 rounded-[--radius-md] px-3 py-2 text-xs text-foreground-quaternary transition-colors hover:bg-surface-hover hover:text-foreground-secondary"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
