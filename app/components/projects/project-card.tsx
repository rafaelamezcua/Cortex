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

  return (
    <div className={cn("group relative", isPending && "opacity-50")}>
      <Link href={`/projects/${project.id}`}>
        <div className="rounded-[--radius-xl] border border-border-light/60 bg-surface p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-accent/20 cursor-pointer">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] text-white"
              style={{ backgroundColor: project.color }}
            >
              <Folder className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-xs text-foreground-tertiary truncate">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-foreground-tertiary">
                {project.completedTasks}/{project.totalTasks} tasks
              </span>
              <span className="font-medium text-foreground-secondary">
                {progress}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-background-tertiary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
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
        onClick={(e) => {
          e.preventDefault()
          if (confirm("Delete this project and all its tasks?")) {
            startTransition(() => deleteProject(project.id))
          }
        }}
        className="absolute top-3 right-3 rounded-[--radius-sm] p-1.5 text-foreground-quaternary opacity-0 group-hover:opacity-100 transition-all hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
