export const dynamic = "force-dynamic"

import { getTasks } from "@/lib/actions/tasks"
import { TaskForm } from "@/app/components/tasks/task-form"
import { TasksView } from "@/app/components/tasks/tasks-view"

function composeTasksLine(tasks: { status: string; dueDate: string | null }[]): string {
  const active = tasks.filter((t) => t.status !== "done")
  if (active.length === 0) {
    return tasks.length === 0
      ? "Nothing here yet. Add your first task below."
      : "All caught up. Nice work."
  }

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const dueToday = active.filter((t) => t.dueDate === todayStr).length
  const overdue = active.filter((t) => t.dueDate && t.dueDate < todayStr).length

  const parts: string[] = [`${active.length} active`]
  if (dueToday > 0) {
    parts.push(`${dueToday} due today`)
  }
  if (overdue > 0) {
    parts.push(`${overdue} overdue`)
  }

  return `${parts.join(", ")}.`
}

export default async function TasksPage() {
  const tasks = await getTasks()
  const tasksLine = composeTasksLine(tasks)

  return (
    <div className="space-y-8">
      <section>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Tasks
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground-secondary">
          {tasksLine}
        </p>
      </section>

      <TaskForm />
      <TasksView tasks={tasks} />
    </div>
  )
}
