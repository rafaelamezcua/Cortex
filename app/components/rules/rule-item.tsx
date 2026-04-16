"use client"

import { cn } from "@/lib/utils"
import { Pencil, Trash2, Check, X } from "lucide-react"
import { useState, useTransition } from "react"
import { deleteRule, toggleRule } from "@/lib/actions/rules"
import type { TriggerType, ActionType } from "@/lib/actions/rules"
import { TRIGGER_META, ACTION_META } from "./rule-meta"
import { RuleForm } from "./rule-form"

interface RuleItemProps {
  rule: {
    id: string
    name: string
    triggerType: TriggerType
    triggerConfig: Record<string, unknown>
    actionType: ActionType
    actionConfig: Record<string, unknown>
    enabled: boolean
  }
}

export function RuleItem({ rule }: RuleItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onToggle(next: boolean) {
    startTransition(async () => {
      await toggleRule(rule.id, next)
    })
  }

  function onDelete() {
    startTransition(async () => {
      await deleteRule(rule.id)
    })
  }

  const triggerSummary = summarizeTriggerConfig(
    rule.triggerType,
    rule.triggerConfig
  )
  const actionSummary = summarizeActionConfig(
    rule.actionType,
    rule.actionConfig
  )

  return (
    <>
      <div
        className={cn(
          "group rounded-[--radius-lg] border border-border-light bg-surface p-4 shadow-xs",
          "transition-all duration-200 ease-out",
          "hover:border-accent/30 hover:bg-surface-raised hover:shadow-sm",
          isPending && "pointer-events-none opacity-50",
          !rule.enabled && "opacity-70"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              className="truncate text-[15px] font-medium tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {rule.name}
            </h3>
            <div className="mt-2 space-y-1 text-[13px] leading-relaxed text-foreground-secondary">
              <p>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                  When
                </span>{" "}
                {TRIGGER_META[rule.triggerType].label}
                {triggerSummary && (
                  <span className="text-foreground-tertiary"> {triggerSummary}</span>
                )}
              </p>
              <p>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                  Then
                </span>{" "}
                {ACTION_META[rule.actionType].label}
                {actionSummary && (
                  <span className="text-foreground-tertiary"> {actionSummary}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <EnabledSwitch
              enabled={rule.enabled}
              onChange={onToggle}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label="Edit rule"
              className="flex h-7 w-7 items-center justify-center rounded-[--radius-sm] text-foreground-quaternary outline-none transition-colors duration-150 hover:bg-surface-active hover:text-accent focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {confirming ? (
              <div className="flex items-center gap-1 rounded-[--radius-sm] bg-danger/10 px-2 py-0.5">
                <span className="text-[11px] font-medium text-danger">Sure?</span>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  aria-label="Cancel delete"
                  className="rounded-[--radius-xs] px-1 py-0.5 text-[11px] text-foreground-tertiary outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                >
                  <X className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  aria-label="Confirm delete"
                  className="rounded-[--radius-xs] px-1 py-0.5 text-[11px] font-semibold text-danger outline-none transition-colors duration-150 hover:bg-danger/20 focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                >
                  <Check className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label="Delete rule"
                className="flex h-7 w-7 items-center justify-center rounded-[--radius-sm] text-foreground-quaternary outline-none transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <RuleForm initial={rule} onClose={() => setIsEditing(false)} />
      )}
    </>
  )
}

function EnabledSwitch({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? "Disable rule" : "Enable rule"}
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border outline-none transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
        enabled ? "bg-accent" : "bg-background-tertiary",
        disabled && "opacity-50"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
          enabled ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

function summarizeTriggerConfig(
  type: TriggerType,
  config: Record<string, unknown>
): string {
  const parts: string[] = []
  if (type === "task.status_changed") {
    if (config.fromStatus) parts.push(`from ${String(config.fromStatus)}`)
    if (config.toStatus) parts.push(`to ${String(config.toStatus)}`)
    if (config.titleContains)
      parts.push(`title has "${String(config.titleContains)}"`)
    if (config.priority) parts.push(`priority ${String(config.priority)}`)
  } else if (type === "task.due_today") {
    if (config.priority) parts.push(`priority ${String(config.priority)}`)
    if (config.titleContains)
      parts.push(`title has "${String(config.titleContains)}"`)
  } else if (type === "habit.streak_hit") {
    if (config.habitId) parts.push(`habit ${String(config.habitId)}`)
    if (typeof config.threshold === "number")
      parts.push(`at ${config.threshold} days`)
  }
  return parts.length === 0 ? "" : `(${parts.join(", ")})`
}

function summarizeActionConfig(
  type: ActionType,
  config: Record<string, unknown>
): string {
  if (type === "create_task" && config.title) {
    return `"${String(config.title).slice(0, 50)}"`
  }
  if (type === "log_chat" && config.message) {
    return `"${String(config.message).slice(0, 50)}"`
  }
  if (type === "send_email" && config.to) {
    return `to ${String(config.to)}`
  }
  return ""
}
