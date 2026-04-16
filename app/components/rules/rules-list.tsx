"use client"

import { Button } from "@/app/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { RuleForm } from "./rule-form"
import { RuleItem } from "./rule-item"
import type { TriggerType, ActionType } from "@/lib/actions/rules"

interface Rule {
  id: string
  name: string
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
  actionType: ActionType
  actionConfig: Record<string, unknown>
  enabled: boolean
}

interface RulesListProps {
  rules: Rule[]
}

export function RulesList({ rules }: RulesListProps) {
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-foreground-tertiary">
          {rules.length === 0
            ? "No rules yet. Create one to react to changes."
            : `${rules.length} ${rules.length === 1 ? "rule" : "rules"}.`}
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-[--radius-xl] border border-dashed border-border-light bg-background-secondary/40 px-6 py-10 text-center">
          <p className="text-[14px] text-foreground-tertiary">
            When something happens in Luma, a rule can react.
          </p>
          <p className="mt-1 text-[13px] text-foreground-quaternary">
            Try: when a task titled &ldquo;deep work&rdquo; is marked done, log it to chat.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {rules.map((r) => (
            <RuleItem key={r.id} rule={r} />
          ))}
        </div>
      )}

      {creating && <RuleForm onClose={() => setCreating(false)} />}
    </div>
  )
}
