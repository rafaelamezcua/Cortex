"use client"

import { useState } from "react"
import {
  generateWeeklyDigest,
  saveWeeklyDigestToVault,
  type WeeklyDigestData,
} from "@/lib/actions/reviews"
import { Card } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { cn } from "@/lib/utils"
import {
  CheckSquare,
  Calendar,
  Clock,
  BookOpen,
  Flame,
  Sparkles,
  Loader2,
  Download,
} from "lucide-react"

interface WeeklyDigestProps {
  data: WeeklyDigestData
  vault: { configured: boolean; available: boolean }
}

export function WeeklyDigest({
  data: initialData,
  vault,
}: WeeklyDigestProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [patterns, setPatterns] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const [savedPath, setSavedPath] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const result = await generateWeeklyDigest()
      if (result.ok) {
        setSummary(result.summary)
        setPatterns(result.patterns)
      } else {
        setError(result.error)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveToVault() {
    if (!summary) return
    setSaveStatus("saving")
    try {
      const result = await saveWeeklyDigestToVault({
        startDate: initialData.startDate,
        endDate: initialData.endDate,
        summary,
        patterns,
      })
      if (result.ok) {
        setSavedPath(result.path)
        setSaveStatus("saved")
        setTimeout(() => setSaveStatus("idle"), 3000)
      } else {
        setError(result.error)
        setSaveStatus("error")
      }
    } catch {
      setSaveStatus("error")
    }
  }

  const rangeLabel = formatRange(initialData.startDate, initialData.endDate)
  const vaultTooltip = !vault.configured
    ? "Set LUMA_BRAIN_PATH to enable."
    : !vault.available
      ? "Vault path isn't reachable right now."
      : ""

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <Card variant="default">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
            Last 7 days
          </h2>
          <span className="text-xs text-foreground-tertiary">
            {rangeLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <DigestStat
            icon={CheckSquare}
            label="Tasks"
            value={initialData.tasksCompleted.toString()}
          />
          <DigestStat
            icon={Flame}
            label="Habits"
            value={
              initialData.habitCompletionPct !== null
                ? `${initialData.habitCompletionPct}%`
                : "-"
            }
          />
          <DigestStat
            icon={Clock}
            label="Focus"
            value={`${initialData.focusMinutes}m`}
          />
          <DigestStat
            icon={BookOpen}
            label="Journal"
            value={`${initialData.journalEntriesWritten}/7`}
          />
          <DigestStat
            icon={Calendar}
            label="Events"
            value={initialData.eventsAttended.toString()}
          />
        </div>

        {initialData.habitBreakdown.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
              Habit detail
            </p>
            <ul className="space-y-1.5">
              {initialData.habitBreakdown.map((h) => (
                <li
                  key={h.name}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="truncate text-foreground-secondary">
                    {h.name}
                  </span>
                  <span className="shrink-0 text-xs text-foreground-tertiary">
                    {h.completedDays}/{h.totalDays}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* AI summary */}
      <Card variant="default">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
            The story
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
            {generating
              ? "Drafting"
              : summary
                ? "Regenerate"
                : "Draft summary"}
          </button>
        </div>

        {error && <p className="mb-3 text-xs text-danger">{error}</p>}

        {!summary && !generating && (
          <p className="text-sm italic text-foreground-tertiary">
            Hit draft summary and Luma will pull a paragraph and three
            patterns from the last week.
          </p>
        )}

        {summary && (
          <div className="space-y-5">
            <p className="text-[15px] leading-[1.7] text-foreground">
              {summary}
            </p>
            {patterns.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                  Notable patterns
                </p>
                <ol className="space-y-1.5">
                  {patterns.map((p, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm text-foreground-secondary"
                    >
                      <span className="shrink-0 font-medium text-accent">
                        {i + 1}.
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <p
                className={cn(
                  "text-xs italic transition-opacity duration-200",
                  saveStatus === "idle" && "opacity-0",
                  saveStatus === "saving" && "text-foreground-quaternary",
                  saveStatus === "saved" && "text-success",
                  saveStatus === "error" && "text-danger"
                )}
              >
                {saveStatus === "saving" && "Saving to vault..."}
                {saveStatus === "saved" && savedPath && `Saved: ${savedPath}`}
                {saveStatus === "error" && "Couldn't save to vault."}
              </p>
              <span title={vaultTooltip}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveToVault}
                  disabled={!vault.available || saveStatus === "saving"}
                >
                  <Download className="h-3.5 w-3.5" />
                  Save to vault
                </Button>
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function DigestStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
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
        className="text-xl font-medium tracking-tight text-foreground"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        {value}
      </p>
    </div>
  )
}

function formatRange(start: string, end: string): string {
  const s = new Date(start + "T12:00:00")
  const e = new Date(end + "T12:00:00")
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${fmt(s)} to ${fmt(e)}`
}
