"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  MessageCircle,
  Calendar,
  CheckSquare,
  FileText,
  ChevronLeft,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
  Flame,
  BookOpen,
  FolderKanban,
  Timer,
} from "lucide-react"
import { LumaLogo } from "@/app/components/ui/luma-logo"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { useTheme } from "@/app/components/theme-provider"

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
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme, resolved } = useTheme()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  function cycleTheme() {
    if (theme === "light") setTheme("dark")
    else if (theme === "dark") setTheme("system")
    else setTheme("light")
  }

  const ThemeIcon = theme === "system" ? Monitor : resolved === "dark" ? Moon : Sun
  const themeLabel =
    theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"

  const sidebarContent = (
    <>
      {/* Logo + wordmark with Luma aura */}
      <div className="relative flex flex-col items-center px-5 pt-7 pb-5">
        {/* Mobile close button, top-right */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[--radius-sm] text-foreground-tertiary transition-colors duration-200 hover:bg-surface-hover hover:text-foreground md:hidden"
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
      <nav className="flex-1 space-y-0.5 px-3 pt-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-[--radius-md] px-3 text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  isActive && "text-accent"
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom controls */}
      <div className="border-t border-border-light/50 p-3 space-y-0.5">
        <button
          onClick={cycleTheme}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-[--radius-md] px-3 text-[13px] text-foreground-tertiary transition-all duration-200 hover:bg-surface-hover hover:text-foreground"
          aria-label={`Theme: ${themeLabel}`}
        >
          <ThemeIcon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="font-medium">{themeLabel}</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden h-11 w-full items-center justify-center gap-3 rounded-[--radius-md] px-3 text-[13px] text-foreground-tertiary transition-all duration-200 hover:bg-surface-hover hover:text-foreground md:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-[18px] w-[18px] shrink-0 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span className="font-medium">Collapse</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-glass-surface-floating backdrop-blur-xl border border-border-light shadow-md transition-colors duration-150 ease-out hover:bg-surface-hover md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[--sidebar-width] flex-col bg-glass-sidebar backdrop-blur-2xl border-r border-border-light/40 transition-transform duration-300 ease-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-full flex-col border-r border-border-light/40 bg-glass-sidebar backdrop-blur-2xl transition-all duration-300 ease-out md:flex",
          collapsed ? "w-[--sidebar-collapsed-width]" : "w-[--sidebar-width]"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
