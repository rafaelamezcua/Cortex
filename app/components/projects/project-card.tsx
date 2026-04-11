"use client"

import { cn } from "@/lib/utils"
import { Folder, Trash2 } from "lucide-react"
import { deleteProject } from "@/lib/actions/projects"
import { useTransition } from "react"
import Link from "next/link"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string | null
    color: string
    status: string
    totalTasks: number
    completedTasks: number
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isPending, startTransition] = useTransition()
  const progress =
    project.totalTasks > 0
      ? Math.round((project.completedTasks / project.totalTasks) * 100)
      : 0
  const isShipped = project.totalTasks > 0 && progress === 100

  return (
    <div className={cn("group relative", isPending && "pointer-events-none opacity-50")}>
      <Link href={`/projects/${project.id}`}>
        <div
          className={cn(
            "cursor-pointer rounded-[--radius-xl] border border-border-light bg-surface p-5 shadow-sm",
            "transition-all duration-300 ease-out",
            "hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface-raised hover:shadow-md",
            "active:translate-y-0"
          )}
        >
          {/* Header */}
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[--radius-md] text-white shadow-sm"
              style={{ backgroundColor: project.color }}
            >
              <Folder className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[15px] font-semibold text-foreground">
                {project.name}
              </h3>
              {project.description && (
                <p className="truncate text-xs text-foreground-tertiary">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-foreground-quaternary">
                {project.totalTasks === 0
                  ? "No tasks yet"
                  : `${project.completedTasks} of ${project.totalTasks} done`}
              </span>
              {project.totalTasks > 0 && (
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    isShipped ? "text-success" : "text-foreground-secondary"
                  )}
                >
                  {progress}%
                </span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-tertiary">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: project.color,
                }}
              />
            </div>
          </div>
        </div>
      </Link>

      {/* Delete */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          if (confirm("Delete this project and all its tasks?")) {
            startTransition(() => deleteProject(project.id))
          }
        }}
        aria-label="Delete project"
        className="absolute right-3 top-3 rounded-[--radius-sm] p-1.5 text-foreground-quaternary opacity-0 transition-all duration-150 hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
