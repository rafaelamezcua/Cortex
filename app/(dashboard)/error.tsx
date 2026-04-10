"use client"

import { Button } from "@/app/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
        <AlertTriangle className="h-7 w-7 text-danger" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-1 text-sm text-foreground-secondary max-w-sm">
          {error.message || "An unexpected error occurred. Try refreshing."}
        </p>
      </div>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
