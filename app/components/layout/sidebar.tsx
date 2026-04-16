"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  MessageCircle,
  Calendar,
  CheckSquare,
  FileText,
  ChevronLeft,
  Menu,
  X,
  Flame,
  BookOpen,
  FolderKanban,
  Timer,
  Brain,
  Network,
} from "lucide-react"
import { LumaLogo } from "@/app/components/ui/luma-logo"
import { ThemeToggle } from "@/app/components/ui/theme-toggle"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/habits", label: "Habits", icon: Flame },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/memories", label: "Memories", icon: Brain },
  { href: "/graph", label: "Graph", icon: Network },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef<HTMLElement>(null)

  // Close drawer when route changes.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close on Escape when the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mobileOpen])

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  const sidebarContent = (
    <>
      {/* Logo + wordmark with Luma aura */}
      <div className="relative flex flex-col items-center px-5 pt-7 pb-5">
        {/* Mobile close button, top-right. Hidden >=lg because the drawer is gone. */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[--radius-sm] text-foreground-tertiary transition-colors duration-200",
            "hover:bg-surface-hover hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]",
            "lg:hidden",
          )}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Aura glow behind logo */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-4 animate-luma-breathe"
            style={{ backgroundImage: "var(--luma-aura)" }}
          />
          <LumaLogo
            size={collapsed ? 48 : 72}
            className="relative shrink-0 text-foreground drop-shadow-sm"
            aria-label="Luma"
          />
        </div>

        {/* Wordmark */}
        {!collapsed && (
          <span
            className="mt-3 font-display text-[1.5rem] font-medium tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Luma
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pt-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-[--radius-md] px-3 text-[13px] font-medium transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  isActive && "text-accent",
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom controls */}
      <div className="space-y-0.5 border-t border-border-light/50 p-3">
        <ThemeToggle compact={collapsed} />

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "hidden h-11 w-full items-center justify-center gap-3 rounded-[--radius-md] px-3 text-[13px] text-foreground-tertiary transition-colors duration-200",
            "hover:bg-surface-hover hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]",
            "lg:flex",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          <ChevronLeft
            className={cn(
              "h-[18px] w-[18px] shrink-0 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
          />
          {!collapsed && <span className="font-medium">Collapse</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger — lives in the top of the main content area, hidden >=lg. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className={cn(
          "fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-glass-surface-floating backdrop-blur-xl border border-border-light shadow-md",
          "transition-colors duration-150 ease-out hover:bg-surface-hover",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]",
          "lg:hidden",
        )}
        aria-label="Open menu"
        aria-expanded={mobileOpen}
        aria-controls="sidebar-drawer"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Mobile backdrop — token-driven scrim, fades via opacity (GPU-friendly). */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-[color:var(--scrim)] backdrop-blur-sm transition-opacity duration-[--duration-normal] ease-[--ease-out] lg:hidden",
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      {/* Mobile drawer — slides via transform only, respects reduced motion. */}
      <aside
        id="sidebar-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal={mobileOpen ? "true" : undefined}
        aria-label="Navigation drawer"
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[--sidebar-width] max-w-[85vw] flex-col bg-glass-sidebar backdrop-blur-2xl border-r border-border-light/40",
          "transition-transform duration-[--duration-normal] ease-[--ease-out] will-change-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar — shown at >=lg (1024px). */}
      <aside
        className={cn(
          "hidden h-full flex-col border-r border-border-light/40 bg-glass-sidebar backdrop-blur-2xl transition-[width] duration-300 ease-out lg:flex",
          collapsed ? "w-[--sidebar-collapsed-width]" : "w-[--sidebar-width]",
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
