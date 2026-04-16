"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  MessageCircle,
  Calendar,
  CheckSquare,
  FileText,
  Search,
  FolderKanban,
  Flame,
  BookOpen,
  Timer,
  Brain,
  Plus,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"

interface Command {
  id: string
  label: string
  hint?: string
  keywords?: string
  icon: React.ElementType
  section: "Navigation" | "Quick actions"
  action: () => void
}

/**
 * Global command palette.
 *
 * Triggers:
 *  - Cmd+K / Ctrl+K: open (or close)
 *  - Esc: close
 *  - Arrow Up/Down: navigate
 *  - Enter: run selected
 *
 * Mounted once in app/layout.tsx so it's available on every route.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const close = useCallback(() => {
    setOpen(false)
    setQuery("")
    setSelectedIndex(0)
  }, [])

  const go = useCallback(
    (href: string) => {
      router.push(href)
      close()
    },
    [router, close],
  )

  const commands = useMemo<Command[]>(
    () => [
      // --- Navigation ---
      { id: "nav-dashboard", label: "Dashboard", keywords: "home overview", icon: LayoutDashboard, section: "Navigation", action: () => go("/") },
      { id: "nav-calendar", label: "Calendar", keywords: "events schedule", icon: Calendar, section: "Navigation", action: () => go("/calendar") },
      { id: "nav-tasks", label: "Tasks", keywords: "todos", icon: CheckSquare, section: "Navigation", action: () => go("/tasks") },
      { id: "nav-notes", label: "Notes", keywords: "writing", icon: FileText, section: "Navigation", action: () => go("/notes") },
      { id: "nav-projects", label: "Projects", keywords: "work", icon: FolderKanban, section: "Navigation", action: () => go("/projects") },
      { id: "nav-habits", label: "Habits", keywords: "routine streak", icon: Flame, section: "Navigation", action: () => go("/habits") },
      { id: "nav-journal", label: "Journal", keywords: "diary entry", icon: BookOpen, section: "Navigation", action: () => go("/journal") },
      { id: "nav-focus", label: "Focus", keywords: "pomodoro timer", icon: Timer, section: "Navigation", action: () => go("/focus") },
      { id: "nav-chat", label: "Chat", keywords: "assistant luma", icon: MessageCircle, section: "Navigation", action: () => go("/chat") },
      { id: "nav-memories", label: "Memories", keywords: "brain vault", icon: Brain, section: "Navigation", action: () => go("/memories") },

      // --- Quick actions (each opens the relevant form on its page) ---
      { id: "new-task", label: "New task", hint: "Open task composer", keywords: "create add todo", icon: Plus, section: "Quick actions", action: () => go("/tasks?new=1") },
      { id: "new-note", label: "New note", hint: "Open note composer", keywords: "create add write", icon: Plus, section: "Quick actions", action: () => go("/notes?new=1") },
      { id: "new-event", label: "New event", hint: "Open event composer", keywords: "create add calendar", icon: Plus, section: "Quick actions", action: () => go("/calendar?new=1") },
      { id: "new-journal", label: "New journal entry", hint: "Write today's entry", keywords: "create add diary", icon: Plus, section: "Quick actions", action: () => go("/journal?new=1") },
    ],
    [go],
  )

  // Fuzzy-ish filter: substring match on label + keywords, tokenized on spaces.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    const tokens = q.split(/\s+/).filter(Boolean)
    return commands.filter((c) => {
      const haystack = `${c.label} ${c.keywords ?? ""} ${c.section}`.toLowerCase()
      return tokens.every((t) => haystack.includes(t))
    })
  }, [commands, query])

  // Group by section, preserving filtered order.
  const grouped = useMemo(() => {
    const sections = new Map<string, Command[]>()
    for (const cmd of filtered) {
      if (!sections.has(cmd.section)) sections.set(cmd.section, [])
      sections.get(cmd.section)!.push(cmd)
    }
    return Array.from(sections.entries())
  }, [filtered])

  // --- Keyboard: open/close shortcut at window level ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"
      if (isToggle) {
        e.preventDefault()
        setOpen((prev) => {
          const next = !prev
          if (next) {
            setQuery("")
            setSelectedIndex(0)
          }
          return next
        })
      } else if (e.key === "Escape" && open) {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, close])

  // Autofocus input after open. Lock body scroll while open.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      clearTimeout(t)
      document.body.style.overflow = prev
    }
  }, [open])

  // Reset selection on every query change.
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keep selected row in view.
  useEffect(() => {
    if (!open) return
    const list = listRef.current
    if (!list) return
    const el = list.querySelector<HTMLElement>(
      `[data-cmd-index="${selectedIndex}"]`,
    )
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex, open])

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const cmd = filtered[selectedIndex]
      if (cmd) cmd.action()
    } else if (e.key === "Home") {
      e.preventDefault()
      setSelectedIndex(0)
    } else if (e.key === "End") {
      e.preventDefault()
      setSelectedIndex(Math.max(filtered.length - 1, 0))
    }
  }

  if (!open) return null

  return (
    // z-[60] sits above the mobile drawer (z-50) so palette trumps nav.
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[14vh] sm:pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop uses the scrim token so both themes look intentional. */}
      <button
        type="button"
        aria-label="Close command palette"
        onClick={close}
        className="absolute inset-0 cursor-default bg-[color:var(--scrim)] backdrop-blur-sm motion-safe:animate-cp-fade"
      />

      <div
        className={cn(
          "relative w-full max-w-xl overflow-hidden rounded-[--radius-xl]",
          "border border-border-light bg-glass-surface-floating backdrop-blur-2xl shadow-xl",
          "motion-safe:animate-cp-in",
        )}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 border-b border-border-light/50 px-5">
          <Search
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-foreground-quaternary"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Jump to, or do..."
            aria-label="Command palette search"
            aria-autocomplete="list"
            aria-activedescendant={
              filtered[selectedIndex]
                ? `cmd-${filtered[selectedIndex].id}`
                : undefined
            }
            className="h-14 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-foreground-quaternary"
          />
          <kbd className="hidden shrink-0 rounded-[6px] border border-border bg-background-secondary px-2 py-1 text-[11px] font-medium text-foreground-quaternary sm:inline">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          className="max-h-[min(60vh,22rem)] overflow-y-auto p-2"
        >
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-foreground-tertiary">
              No matches. Try a different search.
            </p>
          ) : (
            grouped.map(([section, cmds]) => (
              <div key={section} className="mb-1 last:mb-0">
                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                  {section}
                </p>
                {cmds.map((cmd) => {
                  const globalIndex = filtered.indexOf(cmd)
                  const isSelected = globalIndex === selectedIndex
                  return (
                    <button
                      id={`cmd-${cmd.id}`}
                      key={cmd.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-cmd-index={globalIndex}
                      onClick={() => cmd.action()}
                      onMouseMove={() => {
                        if (globalIndex !== selectedIndex)
                          setSelectedIndex(globalIndex)
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[--radius-md] px-3 py-2.5 text-left text-sm transition-colors duration-150",
                        "focus-visible:outline-none",
                        isSelected
                          ? "bg-accent text-white"
                          : "text-foreground hover:bg-surface-hover",
                      )}
                    >
                      <cmd.icon
                        aria-hidden="true"
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isSelected ? "text-white" : "text-foreground-tertiary",
                        )}
                      />
                      <span className="flex-1 truncate font-medium">
                        {cmd.label}
                      </span>
                      {cmd.hint && (
                        <span
                          className={cn(
                            "truncate text-xs",
                            isSelected
                              ? "text-white/75"
                              : "text-foreground-quaternary",
                          )}
                        >
                          {cmd.hint}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer legend */}
        <div className="flex items-center justify-between gap-3 border-t border-border-light/50 bg-[color:var(--surface-hover)]/40 px-4 py-2 text-[11px] text-foreground-tertiary">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <ArrowUp className="h-3 w-3" aria-hidden="true" />
              <ArrowDown className="h-3 w-3" aria-hidden="true" />
              <span>navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
              <span>select</span>
            </span>
          </div>
          <span className="font-medium text-foreground-quaternary">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  )
}
