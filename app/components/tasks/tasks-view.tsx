"use client"

import { useState } from "react"
import { TaskList } from "./task-list"
import { KanbanView } from "./kanban-view"
import { TimelineView } from "./timeline-view"
import { List, Columns3, GitBranch } from "lucide-react"
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

type ViewMode = "list" | "kanban" | "timeline"

const views = [
  { key: "list" as const, label: "List", icon: List },
  { key: "kanban" as const, label: "Board", icon: Columns3 },
  { key: "timeline" as const, label: "Timeline", icon: GitBranch },
]

export function TasksView({ tasks }: { tasks: Task[] }) {
  const [view, setView] = useState<ViewMode>("list")

  return (
    <div className="space-y-4">
      {/* View switcher */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-[--radius-md] border border-border-light bg-background-secondary p-0.5">
          {views.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-[--radius-sm] px-3 py-1.5 text-xs font-medium transition-all",
                view === v.key
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-tertiary hover:text-foreground"
              )}
            >
              <v.icon className="h-3.5 w-3.5" />
              {v.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-foreground-quaternary">
          {tasks.filter((t) => !t.parentId && t.status !== "done").length} active
        </span>
      </div>

      {/* Views */}
      {view === "list" && <TaskList tasks={tasks} />}
      {view === "kanban" && <KanbanView tasks={tasks} />}
      {view === "timeline" && <TimelineView tasks={tasks} />}
    </div>
  )
}
