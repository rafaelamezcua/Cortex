export const dynamic = "force-dynamic"

import { getTasks } from "@/lib/actions/tasks"
import { TaskForm } from "@/app/components/tasks/task-form"
import { TasksView } from "@/app/components/tasks/tasks-view"

export default async function TasksPage() {
  const tasks = await getTasks()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Stay on top of what matters.
        </p>
      </div>

      <TaskForm />
      <TasksView tasks={tasks} />
    </div>
  )
}
