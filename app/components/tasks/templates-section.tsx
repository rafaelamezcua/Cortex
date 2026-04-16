"use client"

import { useState, useTransition } from "react"
import { useTaskTemplate, deleteTaskTemplate } from "@/lib/actions/tasks"
import { cn } from "@/lib/utils"
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  Play,
  Trash2,
} from "lucide-react"

type Template = {
  id: string
  title: string
  description: string | null
  priority: string
  parentId?: string | null
  recurrence?: string | null
}

interface Props {
  templates: Template[]
}

export function TemplatesSection({ templates }: Props) {
  const [open, setOpen] = useState(false)
  const roots = templates.filter((t) => !t.parentId)

  if (roots.length === 0) return null

  const childrenByParent = new Map<string, Template[]>()
  for (const t of templates) {
    if (t.parentId) {
      const arr = childrenByParent.get(t.parentId) ?? []
      arr.push(t)
      childrenByParent.set(t.parentId, arr)
    }
  }

  return (
    <section className="rounded-[--radius-xl] border border-border-light bg-surface/60 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-[--radius-xl] px-5 py-4 transition-colors hover:bg-surface-hover/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Templates
          </h2>
          <span className="text-xs text-foreground-quaternary">
            {roots.length}
          </span>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-foreground-tertiary" />
        ) : (
          <ChevronRight className="h-4 w-4 text-foreground-tertiary" />
        )}
      </button>
      {open && (
        <ul className="space-y-2 border-t border-border-light/40 p-4">
          {roots.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              children={childrenByParent.get(t.id) ?? []}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function TemplateRow({
  template,
  children,
}: {
  template: Template
  children: Template[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  function clone() {
    startTransition(async () => {
      await useTaskTemplate(template.id)
    })
  }

  function remove() {
    if (!confirm("Delete this template?")) return
    startTransition(async () => {
      await deleteTaskTemplate(template.id)
    })
  }

  return (
    <li
      className={cn(
        "rounded-[--radius-lg] border border-border-light bg-surface p-3 transition-all duration-200 hover:border-accent/30 hover:shadow-md",
        isPending && "pointer-events-none opacity-60"
      )}
    >
      <div className="flex items-center gap-2">
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse children" : "Expand children"}
            className="flex h-5 w-5 items-center justify-center rounded-[--radius-sm] text-foreground-quaternary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {template.title}
          </p>
          {children.length > 0 && (
            <p className="text-[11px] text-foreground-quaternary">
              {children.length} subtask{children.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={clone}
          disabled={isPending}
          title="Use template"
          aria-label="Use template"
          className="flex items-center gap-1 rounded-[--radius-sm] bg-accent px-2.5 py-1 text-[11px] font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <Play className="h-3 w-3" />
          Use
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          aria-label="Delete template"
          className="rounded-[--radius-sm] p-1.5 text-foreground-quaternary transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {expanded && children.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-border-light/40 pt-2 pl-7">
          {children.map((c) => (
            <li
              key={c.id}
              className="text-xs text-foreground-secondary truncate"
            >
              {c.title}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
