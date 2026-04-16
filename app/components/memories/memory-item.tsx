"use client"

import { cn, formatRelativeDate } from "@/lib/utils"
import { Trash2, Check, X, Pencil } from "lucide-react"
import { useState, useTransition } from "react"
import {
  updateMemory,
  deleteMemory,
} from "@/lib/actions/memories"

interface MemoryItemProps {
  memory: {
    id: string
    content: string
    updatedAt: string
  }
}

export function MemoryItem({ memory }: MemoryItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(memory.content)
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function startEdit() {
    setDraft(memory.content)
    setIsEditing(true)
  }

  function cancelEdit() {
    setDraft(memory.content)
    setIsEditing(false)
  }

  function saveEdit() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === memory.content) {
      cancelEdit()
      return
    }
    startTransition(async () => {
      await updateMemory(memory.id, trimmed)
      setIsEditing(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteMemory(memory.id)
    })
  }

  return (
    <div
      className={cn(
        "group relative rounded-[--radius-lg] border border-border-light bg-surface p-4 shadow-xs",
        "transition-all duration-200 ease-out",
        !isEditing && "hover:border-accent/30 hover:bg-surface-raised hover:shadow-sm",
        isPending && "pointer-events-none opacity-50"
      )}
    >
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            rows={Math.max(2, Math.ceil(draft.length / 60))}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault()
                cancelEdit()
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                saveEdit()
              }
            }}
            className="w-full resize-none rounded-[--radius-md] border border-border bg-surface-raised px-3 py-2 text-[14px] leading-relaxed text-foreground outline-none transition-colors duration-150 focus:border-accent/60"
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-foreground-quaternary">
              Cmd+Enter to save, Esc to cancel
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={cancelEdit}
                aria-label="Cancel edit"
                className="flex h-7 w-7 items-center justify-center rounded-[--radius-sm] text-foreground-tertiary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={saveEdit}
                aria-label="Save edit"
                disabled={!draft.trim()}
                className="flex h-7 w-7 items-center justify-center rounded-[--radius-sm] text-accent outline-none transition-colors duration-150 hover:bg-accent-light disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={startEdit}
            aria-label="Edit memory"
            className="block w-full cursor-text text-left text-[14px] leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:rounded-[--radius-sm]"
          >
            {memory.content}
          </button>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-foreground-quaternary">
              {formatRelativeDate(memory.updatedAt)}
            </p>

            <div className="flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                onClick={startEdit}
                aria-label="Edit"
                className="flex h-7 w-7 items-center justify-center rounded-[--radius-sm] text-foreground-quaternary outline-none transition-colors duration-150 hover:bg-surface-active hover:text-accent focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:opacity-100"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {confirming ? (
                <div className="flex items-center gap-1 rounded-[--radius-sm] bg-danger/10 px-2 py-0.5">
                  <span className="text-[11px] font-medium text-danger">
                    Sure?
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    aria-label="Cancel delete"
                    className="rounded-[--radius-xs] px-1 py-0.5 text-[11px] text-foreground-tertiary outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    aria-label="Confirm delete"
                    className="rounded-[--radius-xs] px-1 py-0.5 text-[11px] font-semibold text-danger outline-none transition-colors duration-150 hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                  >
                    Yes
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  aria-label="Delete"
                  className="flex h-7 w-7 items-center justify-center rounded-[--radius-sm] text-foreground-quaternary outline-none transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
