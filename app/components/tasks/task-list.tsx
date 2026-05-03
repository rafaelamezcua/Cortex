"use client"

import { TaskItem } from "./task-item"
import { TaskModal } from "./task-modal"
import { BulkActionsBar } from "./bulk-actions-bar"
import { useState, useEffect, useTransition } from "react"
import { cn } from "@/lib/utils"
import { unarchiveTask, deleteTask } from "@/lib/actions/tasks"
import { ArchiveRestore, Trash2, Archive, CheckSquare, Square } from "lucide-react"

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
  archivedAt?: string | null
}

type Filter = "all" | "active" | "done" | "archived"

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
]

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<Filter>("all")
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [archived, setArchived] = useState<Task[] | null>(null)
  const [archivedLoading, setArchivedLoading] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Lazy-load archived tasks the first time the tab is selected.
  useEffect(() => {
    if (filter !== "archived" || archived !== null) return
    setArchivedLoading(true)
    fetch("/api/tasks/archived")
      .then((r) => r.json())
      .then((data) => setArchived(data.tasks ?? []))
      .catch(() => setArchived([]))
      .finally(() => setArchivedLoading(false))
  }, [filter, archived])

  // Selection auto-clears when leaving selection mode or changing filters
  useEffect(() => {
    if (!selectMode) setSelectedIds(new Set())
  }, [selectMode])
  useEffect(() => {
    setSelectedIds(new Set())
  }, [filter])

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (filter === "archived") {
    return (
      <div className="space-y-4">
        <FilterTabs filter={filter} onChange={setFilter} />
        <ArchivedList
          tasks={archived ?? []}
          loading={archivedLoading}
          onChange={() =>
            fetch("/api/tasks/archived")
              .then((r) => r.json())
              .then((data) => setArchived(data.tasks ?? []))
          }
        />
      </div>
    )
  }

  const roots = tasks.filter((t) => !t.parentId)
  const childrenByParent = new Map<string, Task[]>()
  for (const t of tasks) {
    if (t.parentId) {
      const arr = childrenByParent.get(t.parentId) ?? []
      arr.push(t)
      childrenByParent.set(t.parentId, arr)
    }
  }

  const filtered = roots.filter((t) => {
    if (filter === "active") return t.status !== "done"
    if (filter === "done") return t.status === "done"
    return true
  })

  const allSelected =
    filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id))
  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <FilterTabs filter={filter} onChange={setFilter} />
        <button
          onClick={() => setSelectMode((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-[--radius-sm] px-2.5 py-1.5 text-xs font-medium transition-colors",
            selectMode
              ? "bg-accent-light text-accent"
              : "text-foreground-tertiary hover:bg-surface-hover hover:text-foreground"
          )}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          {selectMode ? "Done selecting" : "Select"}
        </button>
      </div>

      {selectMode && (
        <BulkActionsBar
          selectedIds={Array.from(selectedIds)}
          onClear={() => {
            setSelectedIds(new Set())
            setSelectMode(false)
          }}
        />
      )}

      <div className="space-y-2">
        {selectMode && filtered.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-2 py-1 text-[11px] font-medium text-foreground-tertiary transition-colors hover:text-foreground"
          >
            {allSelected ? (
              <CheckSquare className="h-3.5 w-3.5 text-accent" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            {allSelected ? "Deselect all" : `Select all (${filtered.length})`}
          </button>
        )}

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground-tertiary">
            {filter === "done"
              ? "No completed tasks yet"
              : filter === "active"
                ? "All caught up!"
                : "No tasks yet. Add one above."}
          </p>
        ) : (
          filtered.map((task) =>
            selectMode ? (
              <SelectableRow
                key={task.id}
                selected={selectedIds.has(task.id)}
                onToggle={() => toggleId(task.id)}
              >
                <TaskItem
                  task={task}
                  subtasks={childrenByParent.get(task.id) ?? []}
                  onClick={() => toggleId(task.id)}
                />
              </SelectableRow>
            ) : (
              <TaskItem
                key={task.id}
                task={task}
                subtasks={childrenByParent.get(task.id) ?? []}
                onClick={() => setEditingTask(task)}
              />
            ),
          )
        )}
      </div>

      {editingTask && (
        <TaskModal
          task={editingTask}
          subtasks={childrenByParent.get(editingTask.id) ?? []}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}

function SelectableRow({
  selected,
  onToggle,
  children,
}: {
  selected: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex items-stretch gap-2 rounded-[--radius-lg] transition-colors",
        selected && "bg-accent-subtle ring-2 ring-accent/30",
      )}
    >
      <button
        onClick={onToggle}
        className="flex shrink-0 items-center px-2 transition-colors"
        aria-label={selected ? "Deselect task" : "Select task"}
      >
        {selected ? (
          <CheckSquare className="h-4 w-4 text-accent" />
        ) : (
          <Square className="h-4 w-4 text-foreground-quaternary hover:text-accent transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function FilterTabs({
  filter,
  onChange,
}: {
  filter: Filter
  onChange: (f: Filter) => void
}) {
  return (
    <div className="flex gap-1 rounded-[--radius-md] bg-background-secondary p-1 w-fit">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            "rounded-[--radius-sm] px-3 py-1.5 text-xs font-medium transition-colors duration-150",
            filter === f.value
              ? "bg-surface text-foreground shadow-sm"
              : "text-foreground-tertiary hover:text-foreground-secondary"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

function ArchivedList({
  tasks,
  loading,
  onChange,
}: {
  tasks: Task[]
  loading: boolean
  onChange: () => void
}) {
  const roots = tasks.filter((t) => !t.parentId)

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-foreground-tertiary">
        Loading archive...
      </p>
    )
  }

  if (roots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover">
          <Archive className="h-5 w-5 text-foreground-tertiary" />
        </div>
        <p className="text-sm text-foreground-tertiary">
          Nothing archived yet
        </p>
        <p className="text-xs text-foreground-quaternary max-w-xs">
          Archive completed tasks to keep your active views clean. They&apos;ll live
          here in case you need them.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {roots.map((task) => (
        <ArchivedRow key={task.id} task={task} onChange={onChange} />
      ))}
    </div>
  )
}

function ArchivedRow({
  task,
  onChange,
}: {
  task: Task
  onChange: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleUnarchive() {
    startTransition(async () => {
      await unarchiveTask(task.id)
      onChange()
    })
  }

  function handleDelete() {
    if (!confirm(`Delete "${task.title}" forever? This can't be undone.`)) return
    startTransition(async () => {
      await deleteTask(task.id)
      onChange()
    })
  }

  const archivedDate = task.archivedAt
    ? new Date(task.archivedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-[--radius-md] border border-border-light bg-surface px-4 py-3 transition-all",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      <Archive className="h-3.5 w-3.5 shrink-0 text-foreground-quaternary" />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            task.status === "done"
              ? "text-foreground-tertiary line-through"
              : "text-foreground-secondary",
          )}
        >
          {task.title}
        </p>
        <p className="text-[11px] text-foreground-quaternary">
          {archivedDate ? `Archived ${archivedDate}` : "Archived"}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleUnarchive}
          disabled={isPending}
          className="flex items-center gap-1 rounded-[--radius-sm] px-2 py-1 text-[11px] font-medium text-foreground-secondary transition-colors hover:bg-accent-light hover:text-accent"
          title="Bring back to active tasks"
        >
          <ArchiveRestore className="h-3 w-3" />
          Unarchive
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-[--radius-sm] p-1 text-foreground-quaternary transition-colors hover:bg-danger/10 hover:text-danger"
          title="Delete forever"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
