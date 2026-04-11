"use client"

import { cn } from "@/lib/utils"
import { MessageCircle, X } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { usePathname, useSearchParams } from "next/navigation"

interface ChatLayoutProps {
  sidebar: ReactNode
  children: ReactNode
}

export function ChatLayout({ sidebar, children }: ChatLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Close drawer when the active conversation changes (i.e. after a nav)
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, searchParams])

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-8">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 overflow-y-auto pr-2 md:block">
        {sidebar}
      </aside>

      {/* Mobile trigger — small floating button in the chat area */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="View conversations"
        className="fixed right-4 top-20 z-30 flex h-10 items-center gap-2 rounded-full border border-border-light bg-glass-surface-floating px-4 text-xs font-medium text-foreground-secondary shadow-md backdrop-blur-xl transition-all duration-150 ease-out hover:border-accent/60 hover:text-accent md:hidden"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Conversations
      </button>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className={cn(
              "fixed inset-y-0 left-0 flex w-[85%] max-w-sm flex-col overflow-y-auto",
              "border-r border-border-light bg-glass-sidebar p-5 shadow-xl backdrop-blur-2xl",
              "animate-in slide-in-from-left duration-200"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                className="text-[20px] font-medium tracking-tight text-foreground"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Conversations
              </h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main chat area */}
      <div className="mx-auto flex min-w-0 flex-1 flex-col md:mx-0">
        {children}
      </div>
    </div>
  )
}
