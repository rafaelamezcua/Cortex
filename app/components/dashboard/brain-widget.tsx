"use client"

import { Card } from "@/app/components/ui/card"
import { WidgetHeader } from "@/app/components/ui/widget-header"
import { Skeleton } from "@/app/components/ui/skeleton"
import { Brain, Trophy, CheckSquare, Circle } from "lucide-react"
import { useEffect, useState } from "react"

interface BrainTask {
  text: string
  done: boolean
  due: string | null
  tags: string[]
}

interface BrainData {
  available: boolean
  exists?: boolean
  date?: string
  tasks?: BrainTask[]
  wins?: string[]
  error?: string
}

export function BrainWidget() {
  const [data, setData] = useState<BrainData | null>(null)

  useEffect(() => {
    fetch("/api/brain")
      .then((r) => r.json())
      .then(setData)
      .catch(() =>
        setData({ available: false, error: "Failed to fetch" })
      )
  }, [])

  if (!data) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
      </Card>
    )
  }

  if (!data.available || !data.exists) {
    return (
      <Card>
        <WidgetHeader icon={Brain} label="Daily Brief" />
        <p className="text-sm text-foreground-tertiary">
          {!data.available
            ? "Connect your Luma Brain vault to see today's brief"
            : `No daily note for ${data.date} yet`}
        </p>
      </Card>
    )
  }

  const openTasks = (data.tasks || []).filter((t) => !t.done)
  const wins = data.wins || []

  return (
    <Card className="col-span-1 md:col-span-2">
      <WidgetHeader
        icon={Brain}
        label="Daily Brief"
        subtitle={`from your vault · ${data.date}`}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Open tasks */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <CheckSquare className="h-3 w-3 text-foreground-quaternary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
              Open Tasks ({openTasks.length})
            </span>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-xs text-foreground-tertiary">
              Nothing open. Nicely done.
            </p>
          ) : (
            <div className="space-y-1.5">
              {openTasks.slice(0, 5).map((task, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Circle className="mt-1 h-2 w-2 shrink-0 text-foreground-quaternary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground line-clamp-2">
                      {task.text}
                    </p>
                    <div className="flex gap-2 mt-0.5">
                      {task.due && (
                        <span className="text-[10px] text-accent font-medium">
                          {task.due}
                        </span>
                      )}
                      {task.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-foreground-quaternary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {openTasks.length > 5 && (
                <p className="text-[10px] text-foreground-quaternary pt-1">
                  +{openTasks.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Wins */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Trophy className="h-3 w-3 text-warning" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
              Wins ({wins.length})
            </span>
          </div>
          {wins.length === 0 ? (
            <p className="text-xs text-foreground-tertiary">
              Log wins in today's note.
            </p>
          ) : (
            <div className="space-y-1.5">
              {wins.slice(0, 5).map((win, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  <p className="text-xs text-foreground line-clamp-2">{win}</p>
                </div>
              ))}
              {wins.length > 5 && (
                <p className="text-[10px] text-foreground-quaternary pt-1">
                  +{wins.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
