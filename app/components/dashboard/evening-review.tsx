"use client"

import { useState, useTransition } from "react"
import {
  generateTodayReviewDraft,
  saveTodayReview,
  type TodayReviewData,
} from "@/lib/actions/reviews"
import { Card } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { cn } from "@/lib/utils"
import {
  CheckSquare,
  Calendar,
  Flame,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react"

interface EveningReviewProps {
  data: TodayReviewData
}

export function EveningReview({ data }: EveningReviewProps) {
  const [draft, setDraft] = useState<string>(data.journalContent)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const [, startSave] = useTransition()

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const result = await generateTodayReviewDraft()
      if (result.ok) {
        setDraft(result.draft)
      } else {
        setGenerateError(result.error)
      }
    } catch (e) {
      setGenerateError(
        e instanceof Error ? e.message : "Something went wrong."
      )
    } finally {
      setGenerating(false)
    }
  }

  function handleSave() {
    setSaveStatus("saving")
    startSave(async () => {
      try {
        await saveTodayReview(data.date, draft)
        setSaveStatus("saved")
        setTimeout(() => setSaveStatus("idle"), 2500)
      } catch {
        setSaveStatus("error")
      }
    })
  }

  const nothingHappened =
    data.completedTasks.length === 0 &&
    data.eventsAttended.length === 0 &&
    data.habitsLogged.length === 0 &&
    data.focusMinutes === 0

  return (
    <div className="space-y-6">
      {/* Day snapshot */}
      <Card variant="default">
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
          Day snapshot
        </h2>
        {nothingHappened ? (
          <p className="text-sm text-foreground-secondary">
            Nothing logged today. That's okay. Some days just pass.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SnapshotStat
              icon={CheckSquare}
              label="Tasks done"
              value={data.completedTasks.length}
            />
            <SnapshotStat
              icon={Calendar}
              label="Events"
              value={data.eventsAttended.length}
            />
            <SnapshotStat
              icon={Flame}
              label="Habits"
              value={data.habitsLogged.length}
            />
            <SnapshotStat
              icon={Clock}
              label="Focus min"
              value={data.focusMinutes}
            />
          </div>
        )}

        {data.completedTasks.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
              You finished
            </p>
            <ul className="space-y-1">
              {data.completedTasks.slice(0, 6).map((t) => (
                <li
                  key={t.id}
                  className="truncate text-sm text-foreground-secondary"
                >
                  {t.title}
                </li>
              ))}
              {data.completedTasks.length > 6 && (
                <li className="text-xs text-foreground-quaternary">
                  and {data.completedTasks.length - 6} more
                </li>
              )}
            </ul>
          </div>
        )}
      </Card>

      {/* Draft area */}
      <Card variant="default">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
            Tonight's journal
          </h2>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-subtle px-3 py-1 text-xs font-medium text-accent transition-all duration-150",
              "hover:bg-accent-light disabled:opacity-50"
            )}
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {generating ? "Drafting" : draft ? "Redraft" : "Draft with Luma"}
          </button>
        </div>

        {generateError && (
          <p className="mb-2 text-xs text-danger">{generateError}</p>
        )}

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Let Luma draft, or start typing. Either way, it's yours."
          className={cn(
            "min-h-[260px] w-full resize-none rounded-[--radius-lg] border border-border-light bg-surface-raised p-5",
            "text-[15px] leading-[1.7] text-foreground",
            "outline-none transition-all duration-200 ease-out",
            "placeholder:italic placeholder:text-foreground-quaternary",
            "focus:border-accent/40 focus:shadow-md"
          )}
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <p
            className={cn(
              "text-xs italic transition-opacity duration-200",
              saveStatus === "idle" && "opacity-0",
              saveStatus === "saving" && "text-foreground-quaternary",
              saveStatus === "saved" && "text-success",
              saveStatus === "error" && "text-danger"
            )}
          >
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved to today's journal"}
            {saveStatus === "error" && "Couldn't save. Try again?"}
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={
              !draft.trim() || saveStatus === "saving" || generating
            }
          >
            Save as today's journal
          </Button>
        </div>
      </Card>
    </div>
  )
}

function SnapshotStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-foreground-tertiary">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className="text-2xl font-medium tracking-tight text-foreground"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {value}
      </p>
    </div>
  )
}
