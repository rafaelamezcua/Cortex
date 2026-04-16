"use client"

import { Button } from "@/app/components/ui/button"
import { Plus, X } from "lucide-react"
import { useState, useTransition } from "react"
import { createMemory } from "@/lib/actions/memories"
import type { MemoryCategory } from "@/lib/memories-types"
import { CATEGORY_META, CATEGORY_ORDER } from "./category-meta"
import { cn } from "@/lib/utils"

export function NewMemoryForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState<MemoryCategory>("preference")
  const [content, setContent] = useState("")
  const [isPending, startTransition] = useTransition()

  function reset() {
    setContent("")
    setCategory("preference")
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <Button size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" />
        New memory
      </Button>
    )
  }

  return (
    <div className="w-full rounded-[--radius-lg] border border-border bg-surface p-4 shadow-sm sm:w-[420px]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Add a memory
        </h3>
        <button
          type="button"
          onClick={reset}
          aria-label="Cancel"
          className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-tertiary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!content.trim()) return
          startTransition(async () => {
            await createMemory(category, content)
            reset()
          })
        }}
        className="space-y-3"
      >
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
            Category
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_ORDER.map((cat) => {
              const active = cat === category
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12px] font-medium outline-none transition-all duration-150",
                    "focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
                    active
                      ? "border-accent/60 bg-accent-light text-accent"
                      : "border-border bg-surface text-foreground-secondary hover:border-accent/30 hover:text-foreground"
                  )}
                >
                  {CATEGORY_META[cat].label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
            What should Luma remember?
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
            rows={3}
            placeholder="Writes best in the morning with one coffee."
            className="w-full resize-none rounded-[--radius-md] border border-border bg-surface-raised px-3 py-2 text-[14px] leading-relaxed text-foreground outline-none transition-colors duration-150 placeholder:text-foreground-quaternary focus:border-accent/60"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={isPending}
            disabled={!content.trim() || isPending}
          >
            Save
          </Button>
        </div>
      </form>
    </div>
  )
}
