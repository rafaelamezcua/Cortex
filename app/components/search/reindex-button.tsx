"use client"

import { useState, useTransition } from "react"
import { Button } from "@/app/components/ui/button"
import { reindexAll } from "@/lib/actions/semantic"
import { RefreshCw, CheckCircle2 } from "lucide-react"

type Counts = Record<string, number>

export function ReindexButton() {
  const [isPending, startTransition] = useTransition()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    setCounts(null)
    startTransition(async () => {
      try {
        const result = await reindexAll()
        setCounts(result.counts)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Reindex failed")
      }
    })
  }

  return (
    <div className="rounded-[--radius-lg] border border-border-light bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-medium text-foreground">Reindex everything</h2>
          <p className="mt-1 text-xs text-foreground-tertiary">
            Rebuilds embeddings for every note, task, event, journal entry, memory, and chat message you have. Can take a minute.
          </p>
        </div>
        <Button size="sm" onClick={handleClick} loading={isPending} disabled={isPending}>
          <RefreshCw className="h-4 w-4" />
          Reindex
        </Button>
      </div>

      {counts && (
        <div className="mt-4 rounded-[--radius-md] border border-border-light bg-background-secondary p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Reindex complete
          </div>
          <ul className="space-y-1 text-xs text-foreground-secondary">
            {Object.entries(counts).map(([kind, count]) => (
              <li key={kind} className="flex items-center justify-between">
                <span className="capitalize">{kind}</span>
                <span className="font-mono tabular-nums text-foreground">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-[--radius-md] border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          {error}
        </div>
      )}
    </div>
  )
}
