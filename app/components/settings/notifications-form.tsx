"use client"

import { useState, useTransition } from "react"
import { Button } from "@/app/components/ui/button"
import { saveNotificationSettings } from "@/lib/actions/settings"
import { CheckCircle2, Save } from "lucide-react"

type Props = {
  initialDailyBriefEnabled: boolean
  initialDailyBriefEmail: string
  initialWeeklyDigestEnabled: boolean
  initialWeeklyDigestEmail: string
  envDailyBriefEmail: string | null
  envWeeklyDigestEmail: string | null
}

export function NotificationsForm({
  initialDailyBriefEnabled,
  initialDailyBriefEmail,
  initialWeeklyDigestEnabled,
  initialWeeklyDigestEmail,
  envDailyBriefEmail,
  envWeeklyDigestEmail,
}: Props) {
  const [dailyEnabled, setDailyEnabled] = useState(initialDailyBriefEnabled)
  const [dailyEmail, setDailyEmail] = useState(initialDailyBriefEmail)
  const [weeklyEnabled, setWeeklyEnabled] = useState(initialWeeklyDigestEnabled)
  const [weeklyEmail, setWeeklyEmail] = useState(initialWeeklyDigestEmail)

  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await saveNotificationSettings({
          dailyBriefEnabled: dailyEnabled,
          dailyBriefEmail: dailyEmail,
          weeklyDigestEnabled: weeklyEnabled,
          weeklyDigestEmail: weeklyEmail,
        })
        setSaved(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed")
      }
    })
  }

  return (
    <div className="space-y-4">
      <NotificationCard
        title="Daily morning brief"
        description="A short email every morning with today's calendar, top tasks, and habits."
        enabled={dailyEnabled}
        onToggle={setDailyEnabled}
        email={dailyEmail}
        onEmailChange={setDailyEmail}
        envFallback={envDailyBriefEmail}
      />

      <NotificationCard
        title="Weekly digest"
        description="A Sunday-evening summary of the week with patterns Luma noticed."
        enabled={weeklyEnabled}
        onToggle={setWeeklyEnabled}
        email={weeklyEmail}
        onEmailChange={setWeeklyEmail}
        envFallback={envWeeklyDigestEmail}
      />

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
        <Button size="sm" onClick={handleSave} loading={isPending} disabled={isPending}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>

      {error && (
        <div className="rounded-[--radius-md] border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          {error}
        </div>
      )}

      <p className="text-xs text-foreground-tertiary">
        Delivery runs from the <code className="rounded bg-background-secondary px-1 py-0.5">/api/cron/*</code> routes — wire them to a scheduler (or the <a href="/settings/rules" className="underline">Rules</a> page) to actually trigger sends.
      </p>
    </div>
  )
}

function NotificationCard({
  title,
  description,
  enabled,
  onToggle,
  email,
  onEmailChange,
  envFallback,
}: {
  title: string
  description: string
  enabled: boolean
  onToggle: (v: boolean) => void
  email: string
  onEmailChange: (v: string) => void
  envFallback: string | null
}) {
  const showEnvHint = envFallback && email.trim().length === 0
  return (
    <div className="rounded-[--radius-lg] border border-border-light bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-medium text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-foreground-tertiary">{description}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-foreground-secondary">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 rounded border-border-light accent-accent"
          />
          Enabled
        </label>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-foreground-secondary">
          Recipient email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={envFallback ?? "you@example.com"}
          disabled={!enabled}
          className="mt-1 block w-full rounded-[--radius-md] border border-border-light bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)] disabled:opacity-50"
        />
        {showEnvHint && (
          <p className="mt-1.5 text-[11px] text-foreground-tertiary">
            Leaving this blank uses the env fallback: <span className="font-mono">{envFallback}</span>
          </p>
        )}
      </div>
    </div>
  )
}
