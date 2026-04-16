"use server"

import { db } from "@/lib/db"
import { rules, ruleRuns, conversations, chatMessages, memories } from "@/lib/schema"
import { eq, desc, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { sendMessage } from "@/lib/integrations/gmail"
import { createTask } from "@/lib/actions/tasks"
import { createMemory } from "@/lib/actions/memories"
import { MEMORY_CATEGORIES, type MemoryCategory } from "@/lib/memories-types"

// ---------- Types ----------

export type TriggerType =
  | "task.status_changed"
  | "task.due_today"
  | "habit.streak_hit"

export type ActionType =
  | "create_task"
  | "log_chat"
  | "send_email"
  | "save_memory"

export interface MemoryContainsCondition {
  category?: MemoryCategory
  text: string
}

export interface TaskStatusChangedPayload {
  taskId: string
  fromStatus: "todo" | "in_progress" | "done" | null
  toStatus: "todo" | "in_progress" | "done"
  task: {
    id: string
    title: string
    description: string | null
    priority: "low" | "medium" | "high"
    status: "todo" | "in_progress" | "done"
    dueDate: string | null
  }
}

export interface TaskDueTodayPayload {
  taskId: string
  task: {
    id: string
    title: string
    description: string | null
    priority: "low" | "medium" | "high"
    dueDate: string | null
  }
}

export interface HabitStreakHitPayload {
  habitId: string
  streak: number
  habit: {
    id: string
    name: string
  }
}

export type TriggerPayload =
  | TaskStatusChangedPayload
  | TaskDueTodayPayload
  | HabitStreakHitPayload

export interface RuleInput {
  name: string
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
  actionType: ActionType
  actionConfig: Record<string, unknown>
  enabled?: boolean
}

// ---------- Helpers ----------

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Build a flat substitution map from a trigger payload. Keys become
 * {{title}}, {{status}}, {{streak}} etc. in action configs.
 */
function buildTemplateVars(
  triggerType: TriggerType,
  payload: TriggerPayload
): Record<string, string> {
  const vars: Record<string, string> = {}

  if (triggerType === "task.status_changed") {
    const p = payload as TaskStatusChangedPayload
    vars.taskId = p.taskId
    vars.fromStatus = p.fromStatus ?? ""
    vars.toStatus = p.toStatus
    vars.status = p.toStatus
    vars.title = p.task.title
    vars.priority = p.task.priority
    vars.dueDate = p.task.dueDate ?? ""
    vars.description = p.task.description ?? ""
  } else if (triggerType === "task.due_today") {
    const p = payload as TaskDueTodayPayload
    vars.taskId = p.taskId
    vars.title = p.task.title
    vars.priority = p.task.priority
    vars.dueDate = p.task.dueDate ?? ""
    vars.description = p.task.description ?? ""
  } else if (triggerType === "habit.streak_hit") {
    const p = payload as HabitStreakHitPayload
    vars.habitId = p.habitId
    vars.streak = String(p.streak)
    vars.title = p.habit.name
    vars.name = p.habit.name
  }

  return vars
}

/** Replace {{key}} placeholders in a string. Unknown keys become empty strings. */
function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return key in vars ? vars[key] : ""
  })
}

/** Walk a config object and render any string value. Leaves non-strings alone. */
function renderConfig<T extends Record<string, unknown>>(
  config: T,
  vars: Record<string, string>
): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(config)) {
    out[k] = typeof v === "string" ? render(v, vars) : v
  }
  return out as T
}

/**
 * Cross-cutting condition: gate the rule on whether any memory contains
 * a substring (optionally restricted to one category). Returns true when
 * no condition is set OR when at least one matching memory exists.
 */
async function passesMemoryContains(
  triggerConfig: Record<string, unknown>
): Promise<boolean> {
  const cond = (triggerConfig as { memoryContains?: MemoryContainsCondition })
    .memoryContains
  const text = cond?.text?.trim().toLowerCase()
  if (!cond || !text) return true

  const rows = cond.category
    ? await db
        .select()
        .from(memories)
        .where(eq(memories.category, cond.category))
        .all()
    : await db.select().from(memories).all()

  return rows.some((m) => m.content.toLowerCase().includes(text))
}

/**
 * Check a trigger payload against a rule's triggerConfig.
 * All conditions within a config are AND-ed. Missing config keys mean "any".
 */
async function matchesTrigger(
  triggerType: TriggerType,
  triggerConfig: Record<string, unknown>,
  payload: TriggerPayload
): Promise<boolean> {
  if (!(await passesMemoryContains(triggerConfig))) return false

  if (triggerType === "task.status_changed") {
    const p = payload as TaskStatusChangedPayload
    const cfg = triggerConfig as {
      fromStatus?: string
      toStatus?: string
      titleContains?: string
      priority?: string
    }
    if (cfg.fromStatus && p.fromStatus !== cfg.fromStatus) return false
    if (cfg.toStatus && p.toStatus !== cfg.toStatus) return false
    if (
      cfg.titleContains &&
      !p.task.title.toLowerCase().includes(cfg.titleContains.toLowerCase())
    ) {
      return false
    }
    if (cfg.priority && p.task.priority !== cfg.priority) return false
    return true
  }

  if (triggerType === "task.due_today") {
    const p = payload as TaskDueTodayPayload
    const cfg = triggerConfig as { priority?: string; titleContains?: string }
    if (cfg.priority && p.task.priority !== cfg.priority) return false
    if (
      cfg.titleContains &&
      !p.task.title.toLowerCase().includes(cfg.titleContains.toLowerCase())
    ) {
      return false
    }
    return true
  }

  if (triggerType === "habit.streak_hit") {
    const p = payload as HabitStreakHitPayload
    const cfg = triggerConfig as { habitId?: string; threshold?: number }
    if (cfg.habitId && p.habitId !== cfg.habitId) return false
    if (typeof cfg.threshold === "number" && p.streak < cfg.threshold) {
      return false
    }
    return true
  }

  return false
}

// ---------- CRUD ----------

export interface StoredRule {
  id: string
  name: string
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
  actionType: ActionType
  actionConfig: Record<string, unknown>
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export async function getRules(): Promise<StoredRule[]> {
  const rows = await db.select().from(rules).orderBy(desc(rules.updatedAt)).all()
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    triggerType: r.triggerType as TriggerType,
    triggerConfig: parseJson<Record<string, unknown>>(r.triggerConfig, {}),
    actionType: r.actionType as ActionType,
    actionConfig: parseJson<Record<string, unknown>>(r.actionConfig, {}),
    enabled: r.enabled,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))
}

export async function createRule(data: RuleInput) {
  const now = new Date().toISOString()
  const id = nanoid()

  await db.insert(rules).values({
    id,
    name: data.name.trim() || "Untitled rule",
    triggerType: data.triggerType,
    triggerConfig: JSON.stringify(data.triggerConfig ?? {}),
    actionType: data.actionType,
    actionConfig: JSON.stringify(data.actionConfig ?? {}),
    enabled: data.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath("/settings/rules")
  return id
}

export async function updateRule(id: string, data: RuleInput) {
  const now = new Date().toISOString()
  await db
    .update(rules)
    .set({
      name: data.name.trim() || "Untitled rule",
      triggerType: data.triggerType,
      triggerConfig: JSON.stringify(data.triggerConfig ?? {}),
      actionType: data.actionType,
      actionConfig: JSON.stringify(data.actionConfig ?? {}),
      enabled: data.enabled ?? true,
      updatedAt: now,
    })
    .where(eq(rules.id, id))

  revalidatePath("/settings/rules")
}

export async function deleteRule(id: string) {
  await db.delete(rules).where(eq(rules.id, id))
  await db.delete(ruleRuns).where(eq(ruleRuns.ruleId, id))
  revalidatePath("/settings/rules")
}

export async function toggleRule(id: string, enabled: boolean) {
  await db
    .update(rules)
    .set({ enabled, updatedAt: new Date().toISOString() })
    .where(eq(rules.id, id))
  revalidatePath("/settings/rules")
}

export async function getRecentRuns(limit = 50) {
  return db
    .select()
    .from(ruleRuns)
    .orderBy(desc(ruleRuns.ranAt))
    .limit(limit)
    .all()
}

// ---------- Engine ----------

async function logRun(
  ruleId: string,
  status: "success" | "error" | "skipped",
  details: string
) {
  try {
    await db.insert(ruleRuns).values({
      id: nanoid(),
      ruleId,
      status,
      details,
      ranAt: new Date().toISOString(),
    })
  } catch {
    // Logging must never break the engine.
  }
}

/**
 * Fetch or create the single conversation where rule log_chat actions write.
 * Title is "Rules log" — stable for easy lookup.
 */
async function getOrCreateRulesConversation(): Promise<string> {
  const existing = await db
    .select()
    .from(conversations)
    .where(eq(conversations.title, "Rules log"))
    .get()
  if (existing) return existing.id

  const now = new Date().toISOString()
  const id = nanoid()
  await db.insert(conversations).values({
    id,
    title: "Rules log",
    createdAt: now,
    updatedAt: now,
  })
  return id
}

async function runAction(
  actionType: ActionType,
  actionConfig: Record<string, unknown>,
  vars: Record<string, string>
): Promise<{ status: "success" | "skipped"; details: string }> {
  const rendered = renderConfig(actionConfig, vars)

  if (actionType === "create_task") {
    const cfg = rendered as {
      title?: string
      description?: string
      priority?: "low" | "medium" | "high"
      dueDateOffsetDays?: number
    }
    const title = (cfg.title ?? "").trim()
    if (!title) {
      return { status: "skipped", details: "create_task: missing title" }
    }

    const fd = new FormData()
    fd.set("title", title)
    if (cfg.description) fd.set("description", cfg.description)
    if (cfg.priority) fd.set("priority", cfg.priority)
    if (typeof cfg.dueDateOffsetDays === "number") {
      const d = new Date()
      d.setDate(d.getDate() + cfg.dueDateOffsetDays)
      const due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      fd.set("dueDate", due)
    }

    await createTask(fd)
    return { status: "success", details: `create_task: "${title}"` }
  }

  if (actionType === "log_chat") {
    const cfg = rendered as { message?: string }
    const message = (cfg.message ?? "").trim()
    if (!message) {
      return { status: "skipped", details: "log_chat: empty message" }
    }

    const conversationId = await getOrCreateRulesConversation()
    const now = new Date().toISOString()
    await db.insert(chatMessages).values({
      id: nanoid(),
      conversationId,
      role: "assistant",
      content: message,
      createdAt: now,
    })
    await db
      .update(conversations)
      .set({ updatedAt: now })
      .where(eq(conversations.id, conversationId))

    return { status: "success", details: `log_chat: "${message.slice(0, 60)}"` }
  }

  if (actionType === "save_memory") {
    const cfg = rendered as { category?: string; content?: string }
    const category = cfg.category as MemoryCategory | undefined
    const content = (cfg.content ?? "").trim()
    if (!category || !MEMORY_CATEGORIES.includes(category)) {
      return {
        status: "skipped",
        details: `save_memory: invalid category "${cfg.category ?? ""}"`,
      }
    }
    if (!content) {
      return { status: "skipped", details: "save_memory: empty content" }
    }
    await createMemory(category, content)
    return {
      status: "success",
      details: `save_memory: [${category}] "${content.slice(0, 60)}"`,
    }
  }

  if (actionType === "send_email") {
    const cfg = rendered as { to?: string; subject?: string; body?: string }
    const to = (cfg.to ?? "").trim()
    const subject = (cfg.subject ?? "").trim()
    const body = (cfg.body ?? "").trim()
    if (!to || !body) {
      return { status: "skipped", details: "send_email: missing to or body" }
    }

    const result = await sendMessage({ to, subject, body })
    if (!result) {
      return { status: "skipped", details: `send_email: Gmail unavailable (to ${to})` }
    }
    return { status: "success", details: `send_email: sent to ${to}` }
  }

  return { status: "skipped", details: `unknown action: ${actionType}` }
}

/**
 * Evaluate a trigger against all enabled rules and run matching actions.
 * Per-action errors are caught and logged; this function never throws.
 */
export async function evaluateTrigger(
  triggerType: TriggerType,
  payload: TriggerPayload
): Promise<void> {
  try {
    const matching = await db
      .select()
      .from(rules)
      .where(and(eq(rules.triggerType, triggerType), eq(rules.enabled, true)))
      .all()

    if (matching.length === 0) return

    const vars = buildTemplateVars(triggerType, payload)

    for (const rule of matching) {
      const triggerConfig = parseJson<Record<string, unknown>>(
        rule.triggerConfig,
        {}
      )
      if (!(await matchesTrigger(triggerType, triggerConfig, payload))) continue

      const actionConfig = parseJson<Record<string, unknown>>(
        rule.actionConfig,
        {}
      )

      try {
        const result = await runAction(
          rule.actionType as ActionType,
          actionConfig,
          vars
        )
        await logRun(rule.id, result.status, result.details)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await logRun(rule.id, "error", msg.slice(0, 500))
      }
    }

    revalidatePath("/settings/rules")
  } catch {
    // Swallow — engine must never break the caller.
  }
}
