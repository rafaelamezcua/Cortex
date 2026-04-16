"use client"

import { Button } from "@/app/components/ui/button"
import { Bookmark, X } from "lucide-react"
import { useEffect, useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { createMemory } from "@/lib/actions/memories"
import type { MemoryCategory } from "@/lib/memories-types"
import {
  CATEGORY_META,
  CATEGORY_ORDER,
} from "@/app/components/memories/category-meta"

interface RememberButtonProps {
  sourceText: string
}

export function RememberButton({ sourceText }: RememberButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState<MemoryCategory>("context")
  const [content, setContent] = useState("")
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Close modal on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen])

  function open() {
    setContent(sourceText.trim().slice(0, 1000))
    setCategory("context")
    setIsOpen(true)
  }

  function save() {
    if (!content.trim()) return
    startTransition(async () => {
      await createMemory(category, content)
      setSaved(true)
      setIsOpen(false)
      // Reset "Saved" chip after a moment
      setTimeout(() => setSaved(false), 1800)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Remember this"
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium outline-none",
          "text-foreground-quaternary transition-all duration-150",
          "hover:bg-surface-hover hover:text-accent",
          "focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
          saved && "bg-accent-light text-accent"
        )}
      >
        <Bookmark className="h-3 w-3" />
        {saved ? "Saved" : "Remember"}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Save memory"
            className="w-full max-w-md rounded-[--radius-xl] border border-border bg-surface-floating p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3
                  className="text-[18px] font-medium tracking-tight text-foreground"
                  style={{ fontFamily: "var(--font-fraunces)" }}
                >
                  Remember this
                </h3>
                <p className="mt-1 text-[12px] text-foreground-tertiary">
                  Edit the wording so it reads as a clear fact.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground-tertiary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mb-3">
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

            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                Memory
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
                rows={4}
                className="w-full resize-none rounded-[--radius-md] border border-border bg-surface-raised px-3 py-2 text-[14px] leading-relaxed text-foreground outline-none transition-colors duration-150 placeholder:text-foreground-quaternary focus:border-accent/60"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={save}
                loading={isPending}
                disabled={!content.trim() || isPending}
              >
                Save memory
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
