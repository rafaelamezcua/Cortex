export const dynamic = "force-dynamic"

import { getProjects, getProjectTasks } from "@/lib/actions/projects"
import { ProjectCard } from "@/app/components/projects/project-card"
import { ProjectForm } from "@/app/components/projects/project-form"

export default async function ProjectsPage() {
  const allProjects = await getProjects()

  // Get task counts for each project
  const projectsWithStats = await Promise.all(
    allProjects.map(async (p) => {
      const tasks = await getProjectTasks(p.id)
      return {
        ...p,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "done").length,
      }
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Track your projects and their progress.
        </p>
      </div>

      <ProjectForm />

      {projectsWithStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-foreground-tertiary">
            No projects yet. Create your first one above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectsWithStats.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
