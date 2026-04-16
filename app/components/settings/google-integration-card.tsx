"use client"

import { useState, useTransition } from "react"
import { Button } from "@/app/components/ui/button"
import { disconnectGoogle } from "@/lib/actions/google"
import { CheckCircle2, Circle, LogOut } from "lucide-react"

export function GoogleIntegrationCard({ connected }: { connected: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDisconnect() {
    setError(null)
    startTransition(async () => {
      try {
        await disconnectGoogle()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Disconnect failed")
      }
    })
  }

  return (
    <div className="rounded-[--radius-lg] border border-border-light bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-medium text-foreground">Google</h2>
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-foreground-tertiary/10 px-2 py-0.5 text-[11px] font-medium text-foreground-tertiary">
                <Circle className="h-3 w-3" />
                Not connected
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-foreground-tertiary">
            Gmail (read + send) and Google Calendar. Used for morning briefs, weekly digests, and calendar sync.
          </p>
        </div>

        {connected ? (
          <Button size="sm" variant="secondary" onClick={handleDisconnect} loading={isPending} disabled={isPending}>
            <LogOut className="h-4 w-4" />
            Disconnect
          </Button>
        ) : (
          <Button size="sm" onClick={() => { window.location.href = "/api/auth/google" }}>
            Connect
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-[--radius-md] border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          {error}
        </div>
      )}
    </div>
  )
}
