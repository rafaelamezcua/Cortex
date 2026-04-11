"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  MessageCircle,
  Calendar,
  CheckSquare,
  FileText,
  Search,
  Sun,
  Moon,
  CalendarDays,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useCallback } from "react"
import { useTheme } from "@/app/components/theme-provider"

interface Command {
  id: string
  label: string
  subtitle?: string
  icon: React.ElementType
  action: () => void
  section: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchResults, setSearchResults] = useState<Command[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { resolved, setTheme } = useTheme()

  const staticCommands: Command[] = [
    { id: "dashboard", label: "Go to Dashboard", icon: LayoutDashboard, action: () => router.push("/"), section: "Navigation" },
    { id: "chat", label: "Go to Chat", icon: MessageCircle, action: () => router.push("/chat"), section: "Navigation" },
    { id: "calendar", label: "Go to Calendar", icon: Calendar, action: () => router.push("/calendar"), section: "Navigation" },
    { id: "tasks", label: "Go to Tasks", icon: CheckSquare, action: () => router.push("/tasks"), section: "Navigation" },
    { id: "notes", label: "Go to Notes", icon: FileText, action: () => router.push("/notes"), section: "Navigation" },
    {
      id: "toggle-theme",
      label: resolved === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      icon: resolved === "dark" ? Sun : Moon,
      action: () => setTheme(resolved === "dark" ? "light" : "dark"),
      section: "Actions",
    },
  ]

  // Search events when query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

    fetch(`/api/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      .then((r) => r.json())
      .then((data) => {
        const events = data.events || []
        const matched = events
          .filter((e: { title: string }) =>
            e.title.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 5)
          .map((e: { id: string; title: string; startTime: string }) => ({
            id: `event-${e.id}`,
            label: e.title,
            subtitle: new Date(e.startTime).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            icon: CalendarDays,
            action: () => {
              const dateKey = e.startTime.split("T")[0]
              router.push(`/calendar`)
            },
            section: "Events",
          }))
        setSearchResults(matched)
      })
      .catch(() => setSearchResults([]))
  }, [query, router])

  const allCommands = [...searchResults, ...staticCommands]

  const filtered = query
    ? allCommands.filter(
        (c) =>
          c.section === "Events" ||
          c.label.toLowerCase().includes(query.toLowerCase())
      )
    : staticCommands

  const sections = new Map<string, Command[]>()
  for (const cmd of filtered) {
    if (!sections.has(cmd.section)) sections.set(cmd.section, [])
    sections.get(cmd.section)!.push(cmd)
  }

  const run = useCallback((cmd: Command) => {
    cmd.action()
    setOpen(false)
    setQuery("")
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
        setQuery("")
        setSelectedIndex(0)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filtered[selectedIndex]) run(filtered[selectedIndex])
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-lg rounded-[--radius-xl] border border-border-light bg-glass-surface-floating backdrop-blur-2xl shadow-lg overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border-light/40 px-5">
          <Search className="h-4 w-4 shrink-0 text-foreground-quaternary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, events..."
            className="h-14 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-foreground-quaternary"
          />
          <kbd className="hidden shrink-0 rounded-[6px] border border-border bg-background-secondary px-2 py-1 text-[11px] font-medium text-foreground-quaternary sm:inline">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-foreground-tertiary">
              No results found
            </p>
          ) : (
            Array.from(sections.entries()).map(([section, cmds]) => (
              <div key={section}>
                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                  {section}
                </p>
                {cmds.map((cmd) => {
                  const globalIndex = filtered.indexOf(cmd)
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => run(cmd)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[--radius-md] px-3 py-3 text-sm transition-all duration-150",
                        globalIndex === selectedIndex
                          ? "bg-accent text-white"
                          : "text-foreground hover:bg-surface-hover"
                      )}
                    >
                      <cmd.icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          globalIndex === selectedIndex
                            ? "text-white"
                            : "text-foreground-tertiary"
                        )}
                      />
                      <div className="flex-1 text-left min-w-0">
                        <span className="font-medium">{cmd.label}</span>
                        {cmd.subtitle && (
                          <span
                            className={cn(
                              "ml-2 text-xs",
                              globalIndex === selectedIndex
                                ? "text-white/70"
                                : "text-foreground-quaternary"
                            )}
                          >
                            {cmd.subtitle}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
