export const dynamic = "force-dynamic"

import { getProjects, getProjectTasks } from "@/lib/actions/projects"
import { ProjectCard } from "@/app/components/projects/project-card"
import { ProjectForm } from "@/app/components/projects/project-form"

function composeProjectsLine(
  count: number,
  totalTasks: number,
  completedTasks: number
): string {
  if (count === 0) return "Nothing in flight yet. Start your first one."
  const openTasks = totalTasks - completedTasks
  if (totalTasks === 0) {
    return count === 1
      ? "One project, no tasks yet."
      : `${count} projects, no tasks yet.`
  }
  const projLabel = count === 1 ? "project" : "projects"
  if (openTasks === 0) {
    return `${count} ${projLabel}, everything shipped. Nice.`
  }
  return `${count} ${projLabel} in flight, ${openTasks} open task${openTasks === 1 ? "" : "s"}.`
}

export default async function ProjectsPage() {
  const allProjects = await getProjects()

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

  const totalTasks = projectsWithStats.reduce((sum, p) => sum + p.totalTasks, 0)
  const completedTasks = projectsWithStats.reduce(
    (sum, p) => sum + p.completedTasks,
    0
  )
  const projectsLine = composeProjectsLine(
    projectsWithStats.length,
    totalTasks,
    completedTasks
  )

  return (
    <div className="space-y-8">
      <section>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Projects
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground-secondary">
          {projectsLine}
        </p>
      </section>

      <ProjectForm />

      {projectsWithStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[--radius-xl] border border-dashed border-border py-16">
          <p className="text-sm text-foreground-tertiary">
            Create your first project above.
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
