"use client"

import { cn } from "@/lib/utils"
import { addProjectTask, updateProjectTask, deleteProjectTask } from "@/lib/actions/projects"
import { Check, Trash2, Plus, GripVertical, Clock } from "lucide-react"
import { useState, useTransition } from "react"
import { ProjectTaskModal } from "./project-task-modal"
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

type ProjectTask = {
  id: string
  projectId: string
  title: string
  description: string | null
  status: string
  dueDate?: string | null
  calendarId?: string | null
  order: number
}

interface ProjectBoardProps {
  projectId: string
  projectColor: string
  tasks: ProjectTask[]
}

const columns = [
  { key: "todo", label: "To Do", dotColor: "bg-foreground-quaternary" },
  { key: "in_progress", label: "In Progress", dotColor: "bg-accent" },
  { key: "done", label: "Done", dotColor: "bg-success" },
]

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] space-y-2 rounded-[--radius-lg] p-2 transition-colors",
        isOver && "bg-accent/5 ring-2 ring-accent/20 ring-inset"
      )}
    >
      {children}
    </div>
  )
}

function DraggableTaskCard({ task, onClick }: { task: ProjectTask; onClick: () => void }) {
  const [isPending, startTransition] = useTransition()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const isDone = task.status === "done"

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-[--radius-lg] border border-border-light/60 bg-surface p-3 transition-all duration-200 hover:shadow-md hover:border-accent/20",
        isDragging && "opacity-50 shadow-lg scale-105",
        isPending && "opacity-50"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          {...listeners}
          {...attributes}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-foreground-quaternary hover:text-foreground-tertiary shrink-0"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <p className={cn("text-sm font-medium", isDone && "line-through text-foreground-tertiary")}>
            {task.title}
          </p>
          {task.dueDate && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="h-2.5 w-2.5 text-foreground-quaternary" />
              <span className="text-[11px] text-foreground-quaternary">
                {new Date(task.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isDone && (
            <button
              onClick={() =>
                startTransition(() =>
                  updateProjectTask(task.id, {
                    status: task.status === "todo" ? "in_progress" : "done",
                  })
                )
              }
              className="rounded p-1 text-foreground-quaternary hover:text-accent transition-colors"
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
  )
}

export function ProjectBoard({ projectId, projectColor, tasks }: ProjectBoardProps) {
  const [isPending, startTransition] = useTransition()
  const [newTaskCol, setNewTaskCol] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as string
    if (!columns.find((c) => c.key === newStatus)) return

    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    startTransition(() =>
      updateProjectTask(taskId, { status: newStatus as "todo" | "in_progress" | "done" })
    )
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {columns.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.key)

          return (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 rounded-full", col.dotColor)} />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                    {col.label}
                  </h3>
                  <span className="text-[11px] text-foreground-quaternary">
                    {columnTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => setNewTaskCol(col.key)}
                  className="rounded p-1 text-foreground-quaternary hover:text-accent transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <DroppableColumn id={col.key}>
                {columnTasks.map((task) => (
                  <DraggableTaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} />
                ))}

                {columnTasks.length === 0 && !newTaskCol && (
                  <p className="py-6 text-center text-xs text-foreground-quaternary">
                    Drag tasks here
                  </p>
                )}

                {newTaskCol === col.key && (
                  <form
                    action={(formData) => {
                      const title = formData.get("title") as string
                      if (title?.trim()) {
                        startTransition(() => addProjectTask(projectId, title))
                      }
                      setNewTaskCol(null)
                    }}
                    className="rounded-[--radius-lg] border border-accent/30 bg-surface p-3"
                  >
                    <input
                      name="title"
                      placeholder="Task name..."
                      autoFocus
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-quaternary"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setNewTaskCol(null)
                      }}
                    />
                  </form>
                )}
              </DroppableColumn>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rounded-[--radius-lg] border border-accent/30 bg-surface p-3 shadow-lg">
            <p className="text-sm font-medium">{activeTask.title}</p>
          </div>
        )}
      </DragOverlay>

      {editingTask && (
        <ProjectTaskModal
          task={editingTask}
          projectColor={projectColor}
          onClose={() => setEditingTask(null)}
        />
      )}
    </DndContext>
  )
}
