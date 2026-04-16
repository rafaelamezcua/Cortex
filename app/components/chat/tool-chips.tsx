"use client"

import { cn } from "@/lib/utils"
import { Wrench, Loader2, Check, TriangleAlert } from "lucide-react"

export interface ToolInvocation {
  id: string
  name: string
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error"
    | "output-denied"
    | "unknown"
}

interface ToolChipsProps {
  tools: ToolInvocation[]
}

// Humanize a tool name like `getCalendarEvents` → `calendar.list`
// We keep it literal but camelCase becomes spaced lowercase for readability.
function prettifyName(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
}

export function ToolChips({ tools }: ToolChipsProps) {
  if (tools.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tools.map((t) => {
        const label = prettifyName(t.name)
        const running =
          t.state === "input-streaming" || t.state === "input-available"
        const errored = t.state === "output-error"
        const denied = t.state === "output-denied"

        return (
          <span
            key={t.id}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums",
              "transition-colors duration-150",
              errored || denied
                ? "border-danger/30 bg-danger/10 text-danger"
                : running
                ? "border-accent/30 bg-accent-light text-accent"
                : "border-border bg-surface text-foreground-secondary"
            )}
            title={`Tool: ${t.name} (${t.state})`}
          >
            {running ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : errored || denied ? (
              <TriangleAlert className="h-2.5 w-2.5" />
            ) : t.state === "output-available" ? (
              <Check className="h-2.5 w-2.5" />
            ) : (
              <Wrench className="h-2.5 w-2.5" />
            )}
            <span className="font-mono text-[10.5px]">{label}</span>
          </span>
        )
      })}
    </div>
  )
}
