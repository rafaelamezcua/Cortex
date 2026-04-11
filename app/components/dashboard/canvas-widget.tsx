"use client"

import { Card } from "@/app/components/ui/card"
import { WidgetHeader } from "@/app/components/ui/widget-header"
import { Skeleton } from "@/app/components/ui/skeleton"
import { GraduationCap, Clock, AlertTriangle, ExternalLink } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface Assignment {
  id: number
  name: string
  due_at: string | null
  course_name: string
  html_url: string
  points_possible: number | null
}

export function CanvasWidget({ isConnected }: { isConnected: boolean }) {
  const [assignments, setAssignments] = useState<Assignment[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isConnected) return

    fetch("/api/canvas")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => setAssignments(data.assignments))
      .catch(() => setError(true))
  }, [isConnected])

  if (!isConnected) {
    return (
      <Card className="col-span-1">
        <WidgetHeader icon={GraduationCap} label="Canvas" />
        <p className="text-sm text-foreground-tertiary">
          Add CANVAS_API_URL and CANVAS_API_TOKEN to connect
        </p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="col-span-1">
        <WidgetHeader icon={GraduationCap} label="Canvas" />
        <p className="text-xs text-foreground-tertiary">Unable to fetch assignments</p>
      </Card>
    )
  }

  if (!assignments) {
    return (
      <Card className="col-span-1">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </Card>
    )
  }

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  return (
    <Card className="col-span-1">
      <WidgetHeader
        icon={GraduationCap}
        label="Canvas"
        subtitle={assignments.length > 0 ? `${assignments.length} upcoming` : undefined}
      />

      {assignments.length === 0 ? (
        <p className="text-sm text-foreground-tertiary">No upcoming assignments</p>
      ) : (
        <div className="space-y-2.5">
          {assignments.slice(0, 8).map((a) => {
            const dueDate = a.due_at ? new Date(a.due_at) : null
            const dueDateStr = dueDate
              ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`
              : null
            const isOverdue = dueDateStr ? dueDateStr < todayStr : false
            const isDueToday = dueDateStr === todayStr

            return (
              <a
                key={a.id}
                href={a.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 rounded-[--radius-md] p-1.5 -mx-1.5 transition-colors hover:bg-surface-hover group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                    {a.name}
                  </p>
                  <p className="text-xs text-foreground-quaternary truncate">
                    {a.course_name}
                  </p>
                  {dueDate && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {isOverdue ? (
                        <AlertTriangle className="h-2.5 w-2.5 text-danger" />
                      ) : (
                        <Clock className="h-2.5 w-2.5 text-foreground-quaternary" />
                      )}
                      <span
                        className={cn(
                          "text-xs",
                          isOverdue
                            ? "text-danger font-medium"
                            : isDueToday
                              ? "text-warning font-medium"
                              : "text-foreground-tertiary"
                        )}
                      >
                        {isOverdue ? "Overdue — " : isDueToday ? "Due today — " : ""}
                        {dueDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>
                <ExternalLink className="h-3 w-3 shrink-0 text-foreground-quaternary opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </a>
            )
          })}
        </div>
      )}
    </Card>
  )
}
