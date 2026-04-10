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
import Image from "next/image"
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
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Image
            src="/luma-logo.svg"
            alt="Luma"
            width={36}
            height={36}
            className="shrink-0"
          />
          {!collapsed && (
            <span className="text-[17px] font-semibold tracking-tight text-foreground">
              Luma
            </span>
          )}
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-[--radius-sm] text-foreground-tertiary hover:bg-surface-hover md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
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
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-surface/80 backdrop-blur-xl border border-border-light/50 shadow-md md:hidden"
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
          "fixed inset-y-0 left-0 z-50 flex w-[--sidebar-width] flex-col bg-background-secondary/80 backdrop-blur-2xl border-r border-border-light/30 transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-full flex-col border-r border-border-light/30 bg-background-secondary/60 backdrop-blur-2xl transition-all duration-300 ease-in-out md:flex",
          collapsed ? "w-[--sidebar-collapsed-width]" : "w-[--sidebar-width]"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
