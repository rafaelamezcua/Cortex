"use client"

import { useEffect, useState, useTransition } from "react"
import { Inbox, Check, X, Mail, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Suggestion = {
  id: string
  source: string
  title: string
  description: string | null
  suggestedDueDate: string | null
  suggestedPriority: string | null
  payload: string | null
}

export function TriageWidget() {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [isPending, startTransition] = useTransition()

  function load() {
    fetch("/api/triage")
      .then((r) => r.json())
      .then((data) => setSuggestions(data.suggestions ?? []))
      .catch(() => setSuggestions([]))
  }

  useEffect(() => {
    load()
  }, [])

  function act(action: "accept" | "dismiss" | "dismissAll", id?: string) {
    startTransition(async () => {
      // Optimistic
      if (suggestions) {
        if (action === "dismissAll") setSuggestions([])
        else if (id) setSuggestions(suggestions.filter((s) => s.id !== id))
      }
      await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      })
      load()
    })
  }

  if (suggestions === null) {
    return null
  }

  if (suggestions.length === 0) {
    return null // Hide widget entirely if no pending suggestions — keep dashboard clean
  }

  return (
    <section
      className={cn(
        "rounded-[--radius-xl] border border-accent/30 bg-accent-subtle/40 p-5",
        isPending && "opacity-90",
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-accent/15">
            <Inbox className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {suggestions.length} suggestion{suggestions.length === 1 ? "" : "s"} from your inbox
            </h2>
            <p className="text-xs text-foreground-tertiary">
              Luma found these emails that look actionable.
            </p>
          </div>
        </div>
        <button
          onClick={() => act("dismissAll")}
          disabled={isPending}
          className="text-[11px] font-medium text-foreground-tertiary hover:text-foreground transition-colors"
        >
          Dismiss all
        </button>
      </div>

      <div className="space-y-2">
        {suggestions.map((s) => {
          let payload: { from?: string; subject?: string; reason?: string } = {}
          try {
            payload = s.payload ? JSON.parse(s.payload) : {}
          } catch {}

          return (
            <div
              key={s.id}
              className="flex items-start gap-3 rounded-[--radius-md] bg-surface/80 backdrop-blur p-3 border border-border-light/40"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-foreground-quaternary mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground line-clamp-1">
                  {s.title}
                </p>
                {payload.from && (
                  <p className="text-[11px] text-foreground-tertiary mt-0.5">
                    {payload.from} · {payload.subject ?? ""}
                  </p>
                )}
                {payload.reason && (
                  <p className="text-[11px] italic text-foreground-quaternary mt-1">
                    {payload.reason}
                  </p>
                )}
                {(s.suggestedDueDate || s.suggestedPriority) && (
                  <div className="flex items-center gap-2 mt-1.5">
                    {s.suggestedDueDate && (
                      <span className="text-[10px] text-accent font-medium">
                        Due {s.suggestedDueDate}
                      </span>
                    )}
                    {s.suggestedPriority === "high" && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-danger">
                        High
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => act("accept", s.id)}
                  disabled={isPending}
                  className="flex items-center gap-1 rounded-[--radius-sm] bg-accent text-white px-2 py-1 text-[11px] font-medium hover:bg-accent-hover transition-colors"
                  title="Add as task"
                >
                  <Check className="h-3 w-3" />
                  Accept
                </button>
                <button
                  onClick={() => act("dismiss", s.id)}
                  disabled={isPending}
                  className="rounded-[--radius-sm] p-1 text-foreground-quaternary hover:bg-surface-hover hover:text-foreground transition-colors"
                  title="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
