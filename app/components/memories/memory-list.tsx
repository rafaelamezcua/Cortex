"use client"

import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { MemoryItem } from "./memory-item"
import { CATEGORY_META, CATEGORY_ORDER } from "./category-meta"
import type { MemoryCategory } from "@/lib/memories-types"

interface Memory {
  id: string
  category: MemoryCategory
  content: string
  createdAt: string
  updatedAt: string
}

interface MemoryListProps {
  grouped: Record<string, Memory[]>
}

export function MemoryList({ grouped }: MemoryListProps) {
  // All sections open by default; user can collapse any
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggle(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat] ?? []
        const isCollapsed = collapsed.has(cat)
        const meta = CATEGORY_META[cat]

        return (
          <section
            key={cat}
            className="overflow-hidden rounded-[--radius-xl] border border-border-light bg-background-secondary/40"
          >
            <button
              type="button"
              onClick={() => toggle(cat)}
              aria-expanded={!isCollapsed}
              className={cn(
                "group flex w-full items-center justify-between px-5 py-4 text-left outline-none",
                "transition-colors duration-150",
                "hover:bg-surface-hover/60",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)]"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-foreground-tertiary transition-transform duration-200 ease-out",
                    isCollapsed && "-rotate-90"
                  )}
                />
                <div className="min-w-0">
                  <h2
                    className="text-[15px] font-medium tracking-tight text-foreground"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    {meta.label}
                  </h2>
                  <p className="mt-0.5 text-[12px] text-foreground-tertiary">
                    {meta.description}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-foreground-secondary">
                {items.length}
              </span>
            </button>

            {!isCollapsed && (
              <div className="border-t border-border-light px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
                {items.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[13px] italic text-foreground-tertiary">
                    Luma hasn&apos;t remembered anything in this category yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {items.map((m) => (
                      <MemoryItem key={m.id} memory={m} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
