export const dynamic = "force-dynamic"

import { getProject, getProjectTasks } from "@/lib/actions/projects"
import { ProjectBoard } from "@/app/components/projects/project-board"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)

  if (!project) notFound()

  const tasks = await getProjectTasks(id)
  const completed = tasks.filter((t) => t.status === "done").length
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm text-foreground-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-[--radius-lg] text-white text-lg font-bold"
          style={{ backgroundColor: project.color }}
        >
          {project.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-sm text-foreground-secondary">
              {project.description}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight">{progress}%</p>
          <p className="text-xs text-foreground-tertiary">
            {completed}/{tasks.length} tasks
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-background-tertiary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: project.color }}
        />
      </div>

      {/* Board */}
      <ProjectBoard
        projectId={id}
        projectColor={project.color}
        tasks={tasks}
      />
    </div>
  )
}
