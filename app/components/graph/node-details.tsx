"use client"

import { cn } from "@/lib/utils"
import { X, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

export type NodeDetailsData = {
  id: string
  kind: "note" | "task" | "event" | "project" | "journal"
  label: string
  href: string
}

const KIND_LABEL: Record<NodeDetailsData["kind"], string> = {
  note: "Note",
  task: "Task",
  event: "Event",
  project: "Project",
  journal: "Journal entry",
}

export function NodeDetails({
  node,
  onClose,
}: {
  node: NodeDetailsData | null
  onClose: () => void
}) {
  const open = node !== null

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <>
      {/* Scrim — only visible on mobile bottom-sheet mode. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-[color:var(--scrim)] backdrop-blur-sm transition-opacity duration-[--duration-normal] ease-[--ease-out] sm:hidden motion-reduce:transition-none",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      {/* Panel: right-side slide on >=sm, bottom sheet on mobile.
          Uses transform + opacity only. z-index 50 documented: above scrim (40). */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Node details"
        aria-hidden={!open}
        className={cn(
          "fixed z-50 flex flex-col bg-glass-surface-floating backdrop-blur-2xl border-border-light shadow-lg",
          "transition-transform duration-[--duration-normal] ease-[--ease-out] will-change-transform motion-reduce:transition-none",
          // Mobile — bottom sheet.
          "inset-x-0 bottom-0 max-h-[70svh] rounded-t-[--radius-xl] border-t",
          open ? "translate-y-0" : "translate-y-full",
          // Desktop — right side panel.
          "sm:inset-y-0 sm:right-0 sm:bottom-auto sm:left-auto sm:max-h-none sm:w-[360px] sm:rounded-none sm:border-t-0 sm:border-l",
          open ? "sm:translate-x-0" : "sm:translate-x-full sm:translate-y-0",
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border-light/60 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
              {node ? KIND_LABEL[node.kind] : ""}
            </p>
            <h2
              className="mt-1 truncate text-[17px] font-medium tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {node?.label ?? ""}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-[--radius-sm] text-foreground-tertiary transition-colors duration-150",
              "hover:bg-surface-hover hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]",
            )}
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-[13px] leading-relaxed text-foreground-secondary">
            Open this {node ? KIND_LABEL[node.kind].toLowerCase() : "item"} to
            view or edit it.
          </p>
        </div>

        <footer className="border-t border-border-light/60 px-5 py-4">
          {node ? (
            <Link
              href={node.href}
              className={cn(
                "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[--radius-md] bg-accent px-5 text-[14px] font-medium text-white shadow-sm transition-all duration-150 ease-out",
                "hover:bg-accent-hover hover:shadow-md active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              Open
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </footer>
      </aside>
    </>
  )
}
