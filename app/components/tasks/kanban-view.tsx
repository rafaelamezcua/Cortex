"use client"

import { cn } from "@/lib/utils"
import { toggleTask, deleteTask } from "@/lib/actions/tasks"
import { Check, Trash2, Clock, AlertTriangle, GripVertical, Repeat } from "lucide-react"
import { useTransition, useState } from "react"
import { TaskModal } from "./task-modal"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { useDroppable, useDraggable } from "@dnd-kit/core"

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
}

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
const priorityColors: Record<string, string> = {
  low: "bg-foreground-quaternary",
  medium: "bg-warning",
  high: "bg-danger",
}

const columns = [
  { key: "todo", label: "To Do", dotColor: "bg-foreground-quaternary" },
  { key: "in_progress", label: "In Progress", dotColor: "bg-accent" },
  { key: "done", label: "Done", dotColor: "bg-success" },
]

function DroppableColumn({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] space-y-2 rounded-[--radius-lg] p-2 transition-colors duration-200",
        isOver && "bg-accent/5 ring-2 ring-accent/20 ring-inset"
      )}
    >
      {children}
    </div>
  )
}

function DraggableCard({
  task,
  onEdit,
}: {
  task: Task
  onEdit: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const isDone = task.status === "done"
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id })

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const isOverdue = task.dueDate && task.dueDate < todayStr && !isDone
  const isDueToday = task.dueDate === todayStr && !isDone

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-[--radius-lg] border border-border-light/60 bg-surface p-3.5 transition-all duration-200",
        "hover:shadow-md hover:border-accent/20",
        isDragging && "opacity-50 shadow-lg scale-105 z-50",
        isPending && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div
          {...listeners}
          {...attributes}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-foreground-quaternary hover:text-foreground-tertiary shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className={cn("h-2 w-2 rounded-full shrink-0", priorityColors[task.priority])}
            />
            <span
              className={cn(
                "text-sm font-medium truncate",
                isDone && "line-through text-foreground-tertiary"
              )}
            >
              {task.title}
            </span>
            {task.recurrence && task.recurrence !== "none" && (
              <Repeat
                className="h-3 w-3 shrink-0 text-accent/70"
                aria-label={`Repeats ${task.recurrence}`}
              />
            )}
          </div>

          {task.description && (
            <p className="text-xs text-foreground-quaternary line-clamp-2 ml-3.5 mb-1.5">
              {task.description}
            </p>
          )}

          {task.dueDate && !isDone && (
            <div className="flex items-center gap-1 ml-3.5">
              {isOverdue ? (
                <AlertTriangle className="h-2.5 w-2.5 text-danger" />
              ) : (
                <Clock className="h-2.5 w-2.5 text-foreground-quaternary" />
              )}
              <span
                className={cn(
                  "text-[11px]",
                  isOverdue
                    ? "text-danger font-medium"
                    : isDueToday
                      ? "text-warning font-medium"
                      : "text-foreground-quaternary"
                )}
              >
                {new Date(task.dueDate + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => startTransition(() => deleteTask(task.id))}
          className="shrink-0 rounded p-1 text-foreground-quaternary opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export function KanbanView({ tasks: allTasks }: { tasks: Task[] }) {
  // Show only top-level tasks on the board. Subtasks belong to the modal.
  const tasks = allTasks.filter((t) => !t.parentId)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as string

    if (!columns.find((c) => c.key === newStatus)) return

    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    // Update via server action
    startTransition(async () => {
      const formData = new FormData()
      formData.set("title", task.title)
      formData.set("description", task.description || "")
      formData.set("priority", task.priority)
      formData.set("dueDate", task.dueDate || "")
      formData.set("status", newStatus)
      const { updateTask } = await import("@/lib/actions/tasks")
      await updateTask(task.id, formData)
    })
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {columns.map((col) => {
            const columnTasks = tasks
              .filter((t) => t.status === col.key)
              .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

            return (
              <div key={col.key} className="space-y-3">
                {/* Column header */}
                <div className="flex items-center gap-2 px-2">
                  <div className={cn("h-2.5 w-2.5 rounded-full", col.dotColor)} />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                    {col.label}
                  </h3>
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background-secondary px-1.5 text-[11px] font-medium text-foreground-quaternary">
                    {columnTasks.length}
                  </span>
                </div>

                <DroppableColumn id={col.key}>
                  {columnTasks.length === 0 ? (
                    <p className="py-8 text-center text-xs text-foreground-quaternary">
                      {col.key === "done"
                        ? "Nothing completed yet"
                        : "Drag tasks here"}
                    </p>
                  ) : (
                    columnTasks.map((task) => (
                      <DraggableCard
                        key={task.id}
                        task={task}
                        onEdit={() => setEditingTask(task)}
                      />
                    ))
                  )}
                </DroppableColumn>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rounded-[--radius-lg] border border-accent/30 bg-surface p-3.5 shadow-lg">
              <p className="text-sm font-medium">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {editingTask && (
        <TaskModal
          task={editingTask}
          subtasks={allTasks.filter((t) => t.parentId === editingTask.id)}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  )
}
