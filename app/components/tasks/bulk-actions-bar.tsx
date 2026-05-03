"use client"

import { Archive, Trash2, X, Calendar, Flag, CheckSquare } from "lucide-react"
import { useTransition, useState } from "react"
import { batchUpdateTasks } from "@/lib/actions/bulk-tasks"
import { cn } from "@/lib/utils"

interface BulkActionsBarProps {
  selectedIds: string[]
  onClear: () => void
}

export function BulkActionsBar({ selectedIds, onClear }: BulkActionsBarProps) {
  const [isPending, startTransition] = useTransition()
  const [openMenu, setOpenMenu] = useState<"date" | "priority" | "status" | null>(null)

  const count = selectedIds.length
  if (count === 0) return null

  function run(action: Parameters<typeof batchUpdateTasks>[1]) {
    startTransition(async () => {
      await batchUpdateTasks(selectedIds, action)
      setOpenMenu(null)
      onClear()
    })
  }

  function handleArchive() {
    if (!confirm(`Archive ${count} task${count === 1 ? "" : "s"}?`)) return
    run({ kind: "archive" })
  }

  function handleDelete() {
    if (
      !confirm(
        `Delete ${count} task${count === 1 ? "" : "s"} forever? This can't be undone.`,
      )
    )
      return
    run({ kind: "delete" })
  }

  return (
    <div
      className={cn(
        "sticky top-2 z-20 flex items-center gap-2 rounded-[--radius-lg] border border-border-light/60 bg-surface/95 backdrop-blur-2xl px-3 py-2 shadow-md transition-opacity",
        isPending && "opacity-60 pointer-events-none",
      )}
    >
      <span className="rounded-[--radius-sm] bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
        {count} selected
      </span>

      <button
        onClick={handleArchive}
        className="flex items-center gap-1.5 rounded-[--radius-sm] px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <Archive className="h-3.5 w-3.5" />
        Archive
      </button>

      <BulkMenu
        icon={Calendar}
        label="Due"
        open={openMenu === "date"}
        onToggle={() => setOpenMenu(openMenu === "date" ? null : "date")}
      >
        <DateOptions onPick={(d) => run({ kind: "setDueDate", dueDate: d })} />
      </BulkMenu>

      <BulkMenu
        icon={Flag}
        label="Priority"
        open={openMenu === "priority"}
        onToggle={() => setOpenMenu(openMenu === "priority" ? null : "priority")}
      >
        {(["low", "medium", "high"] as const).map((p) => (
          <button
            key={p}
            onClick={() => run({ kind: "setPriority", priority: p })}
            className="flex w-full items-center gap-2 rounded-[--radius-sm] px-2 py-1.5 text-xs text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                p === "high"
                  ? "bg-danger"
                  : p === "medium"
                    ? "bg-warning"
                    : "bg-foreground-quaternary",
              )}
            />
            {p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
      </BulkMenu>

      <BulkMenu
        icon={CheckSquare}
        label="Status"
        open={openMenu === "status"}
        onToggle={() => setOpenMenu(openMenu === "status" ? null : "status")}
      >
        {(
          [
            { v: "todo", label: "To Do" },
            { v: "in_progress", label: "In Progress" },
            { v: "done", label: "Done" },
          ] as const
        ).map((s) => (
          <button
            key={s.v}
            onClick={() => run({ kind: "setStatus", status: s.v })}
            className="block w-full rounded-[--radius-sm] px-2 py-1.5 text-left text-xs text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            {s.label}
          </button>
        ))}
      </BulkMenu>

      <button
        onClick={handleDelete}
        className="flex items-center gap-1.5 rounded-[--radius-sm] px-2 py-1 text-xs font-medium text-foreground-quaternary transition-colors hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={onClear}
          className="rounded-[--radius-sm] p-1 text-foreground-quaternary transition-colors hover:bg-surface-hover hover:text-foreground"
          title="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function BulkMenu({
  icon: Icon,
  label,
  open,
  onToggle,
  children,
}: {
  icon: React.ElementType
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 rounded-[--radius-sm] px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[140px] rounded-[--radius-md] border border-border-light bg-surface p-1 shadow-lg">
          {children}
        </div>
      )}
    </div>
  )
}

function DateOptions({ onPick }: { onPick: (date: string | null) => void }) {
  const today = new Date()
  function offset(days: number): string {
    const d = new Date(today)
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }

  const presets: { label: string; value: string | null }[] = [
    { label: "Today", value: offset(0) },
    { label: "Tomorrow", value: offset(1) },
    { label: "This weekend", value: offset(((6 - today.getDay()) % 7) || 7) },
    { label: "Next week", value: offset(7) },
    { label: "Clear due date", value: null },
  ]

  return (
    <div className="flex flex-col">
      {presets.map((p) => (
        <button
          key={p.label}
          onClick={() => onPick(p.value)}
          className="rounded-[--radius-sm] px-2 py-1.5 text-left text-xs text-foreground-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
