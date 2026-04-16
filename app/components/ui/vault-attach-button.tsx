"use client"

import { cn } from "@/lib/utils"
import { BookOpen, Check, Loader2, AlertCircle } from "lucide-react"
import { useState, useTransition } from "react"
import type { VaultWriteResult } from "@/lib/integrations/luma-brain"

interface VaultAttachButtonProps {
  onAttach: () => Promise<VaultWriteResult>
  label?: string
  className?: string
  size?: "sm" | "md"
  disabled?: boolean
  disabledReason?: string
}

type Status = "idle" | "saved" | "error"

export function VaultAttachButton({
  onAttach,
  label = "Save to Obsidian",
  className,
  size = "sm",
  disabled = false,
  disabledReason,
}: VaultAttachButtonProps) {
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (disabled) return
    startTransition(async () => {
      const result = await onAttach()
      if (result.ok) {
        setStatus("saved")
        setErrorMsg("")
        setTimeout(() => setStatus("idle"), 3000)
      } else {
        setStatus("error")
        setErrorMsg(result.error)
        setTimeout(() => setStatus("idle"), 4000)
      }
    })
  }

  const isSaved = status === "saved"
  const isError = status === "error"
  const isDisabled = disabled || isPending || isSaved

  const tooltip = disabled
    ? disabledReason || "Vault not configured"
    : isError
      ? errorMsg
      : label

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      title={tooltip}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium transition-all duration-200 ease-out",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        disabled
          ? "border-border bg-surface text-foreground-quaternary"
          : isSaved
            ? "border-success/40 bg-success/10 text-success"
            : isError
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-border bg-surface text-foreground-secondary hover:border-accent/60 hover:bg-accent-subtle hover:text-accent",
        "disabled:cursor-not-allowed",
        disabled && "opacity-60",
        className
      )}
    >
      {isPending ? (
        <Loader2 className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4", "animate-spin")} />
      ) : isSaved ? (
        <Check className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} strokeWidth={3} />
      ) : isError ? (
        <AlertCircle className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      ) : (
        <BookOpen className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      )}
      {isPending
        ? "Saving..."
        : isSaved
          ? "Saved to vault"
          : isError
            ? "Vault error"
            : label}
    </button>
  )
}
