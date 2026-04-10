"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  MessageCircle,
  Calendar,
  CheckSquare,
  FileText,
  ChevronLeft,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
} from "lucide-react"
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
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme, resolved } = useTheme()

  // Close mobile drawer on navigation
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
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[--radius-sm] bg-accent">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Luma
            </span>
          )}
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-[--radius-sm] text-foreground-secondary hover:bg-surface-hover md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
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
                "flex h-10 items-center gap-3 rounded-[--radius-md] px-3 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-surface-active text-foreground"
                  : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom controls */}
      <div className="border-t border-border-light p-3 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="flex h-10 w-full items-center justify-center gap-3 rounded-[--radius-md] px-3 text-sm text-foreground-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
          aria-label={`Theme: ${themeLabel}. Click to change.`}
        >
          <ThemeIcon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>{themeLabel}</span>}
        </button>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden h-10 w-full items-center justify-center gap-3 rounded-[--radius-md] px-3 text-sm text-foreground-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground md:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-[18px] w-[18px] shrink-0 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-surface border border-border-light shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[--sidebar-width] flex-col border-r border-border-light bg-background-secondary transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-full flex-col border-r border-border-light bg-background-secondary transition-all duration-300 ease-in-out md:flex",
          collapsed ? "w-[--sidebar-collapsed-width]" : "w-[--sidebar-width]"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
