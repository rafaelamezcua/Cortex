"use client"

import { useState, useTransition } from "react"
import { installPreset, uninstallPreset } from "@/lib/actions/rule-presets"
import { Sparkles, Plus, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type Preset = {
  id: string
  name: string
  description: string
  category: string
  installed: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  tasks: "Tasks",
  habits: "Habits",
  wellness: "Wellness",
  communication: "Communication",
}

export function PresetsSection({ presets }: { presets: Preset[] }) {
  const [isPending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({})

  const grouped = new Map<string, Preset[]>()
  for (const p of presets) {
    const arr = grouped.get(p.category) ?? []
    arr.push(p)
    grouped.set(p.category, arr)
  }

  function toggle(p: Preset) {
    const currentlyInstalled = optimistic[p.id] ?? p.installed
    setOptimistic((prev) => ({ ...prev, [p.id]: !currentlyInstalled }))
    startTransition(async () => {
      if (currentlyInstalled) {
        await uninstallPreset(p.id)
      } else {
        await installPreset(p.id)
      }
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h2 className="text-base font-semibold tracking-tight">Quick presets</h2>
        <span className="text-xs text-foreground-quaternary">
          One-click rules — toggle to install or remove
        </span>
      </div>

      {Array.from(grouped.entries()).map(([cat, items]) => (
        <div key={cat} className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
            {CATEGORY_LABELS[cat] ?? cat}
          </h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {items.map((p) => {
              const installed = optimistic[p.id] ?? p.installed
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p)}
                  disabled={isPending}
                  className={cn(
                    "group flex flex-col gap-1.5 rounded-[--radius-lg] border bg-surface px-4 py-3 text-left transition-all",
                    "hover:border-accent/30 hover:shadow-sm",
                    installed
                      ? "border-accent/40 bg-accent-subtle"
                      : "border-border-light",
                    isPending && "opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {p.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                        installed
                          ? "bg-accent/15 text-accent"
                          : "bg-background-secondary text-foreground-tertiary group-hover:bg-accent/10 group-hover:text-accent",
                      )}
                    >
                      {installed ? (
                        <>
                          <Check className="h-2.5 w-2.5" /> Installed
                        </>
                      ) : (
                        <>
                          <Plus className="h-2.5 w-2.5" /> Install
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground-tertiary leading-relaxed">
                    {p.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
