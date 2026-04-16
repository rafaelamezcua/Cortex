"use client"

import { Button } from "@/app/components/ui/button"
import { X } from "lucide-react"
import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import {
  TRIGGER_TYPES,
  TRIGGER_META,
  ACTION_TYPES,
  ACTION_META,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from "./rule-meta"
import type { TriggerType, ActionType, RuleInput } from "@/lib/actions/rules"
import { createRule, updateRule } from "@/lib/actions/rules"

interface RuleFormProps {
  initial?: {
    id: string
    name: string
    triggerType: TriggerType
    triggerConfig: Record<string, unknown>
    actionType: ActionType
    actionConfig: Record<string, unknown>
    enabled: boolean
  }
  onClose: () => void
}

type TaskStatus = "todo" | "in_progress" | "done"
type Priority = "low" | "medium" | "high"

export function RuleForm({ initial, onClose }: RuleFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [triggerType, setTriggerType] = useState<TriggerType>(
    initial?.triggerType ?? "task.status_changed"
  )
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(
    initial?.triggerConfig ?? {}
  )
  const [actionType, setActionType] = useState<ActionType>(
    initial?.actionType ?? "log_chat"
  )
  const [actionConfig, setActionConfig] = useState<Record<string, unknown>>(
    initial?.actionConfig ?? {}
  )
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [isPending, startTransition] = useTransition()

  function changeTriggerType(next: TriggerType) {
    setTriggerType(next)
    setTriggerConfig({})
  }

  function changeActionType(next: ActionType) {
    setActionType(next)
    setActionConfig({})
  }

  function submit() {
    if (!name.trim()) return
    const payload: RuleInput = {
      name: name.trim(),
      triggerType,
      triggerConfig,
      actionType,
      actionConfig,
      enabled,
    }
    startTransition(async () => {
      if (initial) {
        await updateRule(initial.id, payload)
      } else {
        await createRule(payload)
      }
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90svh] w-full max-w-xl flex-col overflow-hidden rounded-[--radius-xl] border border-border bg-surface shadow-lg"
      >
        <header className="flex items-center justify-between border-b border-border-light px-5 py-4">
          <h2
            className="text-[17px] font-medium tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {initial ? "Edit rule" : "New rule"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-tertiary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="flex-1 space-y-5 overflow-y-auto px-5 py-5"
        >
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Notify on deep work done"
              className="w-full rounded-[--radius-md] border border-border bg-surface-raised px-3 py-2 text-[14px] text-foreground outline-none transition-colors duration-150 placeholder:text-foreground-quaternary focus:border-accent/60"
            />
          </Field>

          <Field label="When">
            <select
              value={triggerType}
              onChange={(e) => changeTriggerType(e.target.value as TriggerType)}
              className="w-full rounded-[--radius-md] border border-border bg-surface-raised px-3 py-2 text-[14px] text-foreground outline-none transition-colors duration-150 focus:border-accent/60"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TRIGGER_META[t].label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] text-foreground-tertiary">
              {TRIGGER_META[triggerType].description}
            </p>
          </Field>

          <TriggerFields
            type={triggerType}
            config={triggerConfig}
            onChange={setTriggerConfig}
          />

          <Field label="Then">
            <select
              value={actionType}
              onChange={(e) => changeActionType(e.target.value as ActionType)}
              className="w-full rounded-[--radius-md] border border-border bg-surface-raised px-3 py-2 text-[14px] text-foreground outline-none transition-colors duration-150 focus:border-accent/60"
            >
              {ACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACTION_META[t].label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] text-foreground-tertiary">
              {ACTION_META[actionType].description}
            </p>
          </Field>

          <ActionFields
            type={actionType}
            config={actionConfig}
            onChange={setActionConfig}
          />

          <div className="flex items-center gap-2 rounded-[--radius-md] bg-background-secondary/60 px-3 py-2.5">
            <input
              id="rule-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <label
              htmlFor="rule-enabled"
              className="text-[13px] text-foreground-secondary"
            >
              Enabled
            </label>
          </div>

          <p className="text-[11px] text-foreground-quaternary">
            Templates like {"{{title}}"}, {"{{status}}"}, {"{{priority}}"}, {"{{streak}}"} are
            replaced with values from the trigger.
          </p>
        </form>

        <footer className="flex items-center justify-end gap-2 border-t border-border-light bg-surface-raised/60 px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            loading={isPending}
            disabled={!name.trim() || isPending}
            onClick={submit}
          >
            {initial ? "Save" : "Create rule"}
          </Button>
        </footer>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
        {label}
      </label>
      {children}
    </div>
  )
}

// ---------- Trigger-specific fields ----------

function TriggerFields({
  type,
  config,
  onChange,
}: {
  type: TriggerType
  config: Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}) {
  function update(patch: Record<string, unknown>) {
    const next = { ...config, ...patch }
    for (const key of Object.keys(patch)) {
      if (
        next[key] === undefined ||
        next[key] === "" ||
        next[key] === null
      ) {
        delete next[key]
      }
    }
    onChange(next)
  }

  if (type === "task.status_changed") {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="From status (optional)">
          <StatusSelect
            value={(config.fromStatus as TaskStatus) ?? ""}
            onChange={(v) => update({ fromStatus: v })}
          />
        </Field>
        <Field label="To status (optional)">
          <StatusSelect
            value={(config.toStatus as TaskStatus) ?? ""}
            onChange={(v) => update({ toStatus: v })}
          />
        </Field>
        <Field label="Title contains (optional)">
          <TextInput
            value={(config.titleContains as string) ?? ""}
            onChange={(v) => update({ titleContains: v })}
            placeholder="deep work"
          />
        </Field>
        <Field label="Priority (optional)">
          <PrioritySelect
            value={(config.priority as Priority) ?? ""}
            onChange={(v) => update({ priority: v })}
          />
        </Field>
      </div>
    )
  }

  if (type === "task.due_today") {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Priority (optional)">
          <PrioritySelect
            value={(config.priority as Priority) ?? ""}
            onChange={(v) => update({ priority: v })}
          />
        </Field>
        <Field label="Title contains (optional)">
          <TextInput
            value={(config.titleContains as string) ?? ""}
            onChange={(v) => update({ titleContains: v })}
            placeholder="review"
          />
        </Field>
      </div>
    )
  }

  if (type === "habit.streak_hit") {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Habit ID">
          <TextInput
            value={(config.habitId as string) ?? ""}
            onChange={(v) => update({ habitId: v })}
            placeholder="habit_abc123"
          />
        </Field>
        <Field label="Threshold (days)">
          <NumberInput
            value={
              typeof config.threshold === "number"
                ? (config.threshold as number)
                : undefined
            }
            onChange={(v) => update({ threshold: v })}
            placeholder="7"
          />
        </Field>
      </div>
    )
  }

  return null
}

// ---------- Action-specific fields ----------

function ActionFields({
  type,
  config,
  onChange,
}: {
  type: ActionType
  config: Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}) {
  function update(patch: Record<string, unknown>) {
    const next = { ...config, ...patch }
    for (const key of Object.keys(patch)) {
      if (
        next[key] === undefined ||
        next[key] === "" ||
        next[key] === null
      ) {
        delete next[key]
      }
    }
    onChange(next)
  }

  if (type === "create_task") {
    return (
      <div className="space-y-3">
        <Field label="Title">
          <TextInput
            value={(config.title as string) ?? ""}
            onChange={(v) => update({ title: v })}
            placeholder="Follow up on {{title}}"
          />
        </Field>
        <Field label="Description (optional)">
          <TextArea
            value={(config.description as string) ?? ""}
            onChange={(v) => update({ description: v })}
            placeholder="Spawned by rule"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Priority (optional)">
            <PrioritySelect
              value={(config.priority as Priority) ?? ""}
              onChange={(v) => update({ priority: v })}
            />
          </Field>
          <Field label="Due in days (optional)">
            <NumberInput
              value={
                typeof config.dueDateOffsetDays === "number"
                  ? (config.dueDateOffsetDays as number)
                  : undefined
              }
              onChange={(v) => update({ dueDateOffsetDays: v })}
              placeholder="1"
            />
          </Field>
        </div>
      </div>
    )
  }

  if (type === "log_chat") {
    return (
      <Field label="Message">
        <TextArea
          value={(config.message as string) ?? ""}
          onChange={(v) => update({ message: v })}
          placeholder="{{title}} wrapped."
        />
      </Field>
    )
  }

  if (type === "send_email") {
    return (
      <div className="space-y-3">
        <Field label="To">
          <TextInput
            value={(config.to as string) ?? ""}
            onChange={(v) => update({ to: v })}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Subject">
          <TextInput
            value={(config.subject as string) ?? ""}
            onChange={(v) => update({ subject: v })}
            placeholder="Task done: {{title}}"
          />
        </Field>
        <Field label="Body">
          <TextArea
            value={(config.body as string) ?? ""}
            onChange={(v) => update({ body: v })}
            placeholder="You just finished {{title}}."
          />
        </Field>
      </div>
    )
  }

  return null
}

// ---------- Primitives ----------

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-[--radius-md] border border-border bg-surface-raised px-3 py-2 text-[14px] text-foreground outline-none transition-colors duration-150 placeholder:text-foreground-quaternary focus:border-accent/60"
    />
  )
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full resize-none rounded-[--radius-md] border border-border bg-surface-raised px-3 py-2 text-[14px] leading-relaxed text-foreground outline-none transition-colors duration-150 placeholder:text-foreground-quaternary focus:border-accent/60"
    />
  )
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  placeholder?: string
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === "") onChange(undefined)
        else {
          const n = Number(raw)
          onChange(Number.isFinite(n) ? n : undefined)
        }
      }}
      placeholder={placeholder}
      className="w-full rounded-[--radius-md] border border-border bg-surface-raised px-3 py-2 text-[14px] text-foreground outline-none transition-colors duration-150 placeholder:text-foreground-quaternary focus:border-accent/60"
    />
  )
}

function StatusSelect({
  value,
  onChange,
}: {
  value: TaskStatus | ""
  onChange: (v: TaskStatus | "") => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TaskStatus | "")}
      className="w-full rounded-[--radius-md] border border-border bg-surface-raised px-3 py-2 text-[14px] text-foreground outline-none transition-colors duration-150 focus:border-accent/60"
    >
      <option value="">Any</option>
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  )
}

function PrioritySelect({
  value,
  onChange,
}: {
  value: Priority | ""
  onChange: (v: Priority | "") => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Priority | "")}
      className={cn(
        "w-full rounded-[--radius-md] border border-border bg-surface-raised px-3 py-2 text-[14px] text-foreground outline-none transition-colors duration-150 focus:border-accent/60"
      )}
    >
      <option value="">Any</option>
      {PRIORITY_OPTIONS.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  )
}
