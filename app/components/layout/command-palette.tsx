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
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useCallback } from "react"
import { useTheme } from "@/app/components/theme-provider"

interface Command {
  id: string
  label: string
  icon: React.ElementType
  action: () => void
  section: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { resolved, setTheme } = useTheme()

  const commands: Command[] = [
    {
      id: "dashboard",
      label: "Go to Dashboard",
      icon: LayoutDashboard,
      action: () => router.push("/"),
      section: "Navigation",
    },
    {
      id: "chat",
      label: "Go to Chat",
      icon: MessageCircle,
      action: () => router.push("/chat"),
      section: "Navigation",
    },
    {
      id: "calendar",
      label: "Go to Calendar",
      icon: Calendar,
      action: () => router.push("/calendar"),
      section: "Navigation",
    },
    {
      id: "tasks",
      label: "Go to Tasks",
      icon: CheckSquare,
      action: () => router.push("/tasks"),
      section: "Navigation",
    },
    {
      id: "notes",
      label: "Go to Notes",
      icon: FileText,
      action: () => router.push("/notes"),
      section: "Navigation",
    },
    {
      id: "toggle-theme",
      label: resolved === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      icon: resolved === "dark" ? Sun : Moon,
      action: () => setTheme(resolved === "dark" ? "light" : "dark"),
      section: "Actions",
    },
  ]

  const filtered = query
    ? commands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  // Group by section
  const sections = new Map<string, Command[]>()
  for (const cmd of filtered) {
    if (!sections.has(cmd.section)) sections.set(cmd.section, [])
    sections.get(cmd.section)!.push(cmd)
  }

  const flatFiltered = filtered

  const run = useCallback(
    (cmd: Command) => {
      cmd.action()
      setOpen(false)
      setQuery("")
    },
    []
  )

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
        setQuery("")
        setSelectedIndex(0)
      }
      if (e.key === "Escape") {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keyboard nav inside palette
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (flatFiltered[selectedIndex]) {
        run(flatFiltered[selectedIndex])
      }
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg rounded-[--radius-xl] border border-border-light bg-surface shadow-lg overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border-light px-4">
          <Search className="h-4 w-4 shrink-0 text-foreground-tertiary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-quaternary"
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-background-secondary px-1.5 py-0.5 text-xs text-foreground-quaternary sm:inline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto p-2">
          {flatFiltered.length === 0 ? (
            <p className="py-6 text-center text-sm text-foreground-tertiary">
              No results found
            </p>
          ) : (
            Array.from(sections.entries()).map(([section, cmds]) => (
              <div key={section}>
                <p className="px-2 py-1.5 text-xs font-medium text-foreground-quaternary">
                  {section}
                </p>
                {cmds.map((cmd) => {
                  const globalIndex = flatFiltered.indexOf(cmd)
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => run(cmd)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[--radius-md] px-3 py-2.5 text-sm transition-colors",
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
                      {cmd.label}
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
