"use server"

import { db } from "@/lib/db"
import { rules } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import {
  RULE_PRESETS,
  PRESET_PREFIX,
  type RulePreset,
} from "@/lib/rule-presets-data"

// Returns the set of preset ids currently installed in the rules table.
export async function getInstalledPresetIds(): Promise<Set<string>> {
  const all = await db.select().from(rules).all()
  const ids = new Set<string>()
  for (const r of all) {
    const m = r.name.match(/\[preset:([\w-]+)\]/)
    if (m) ids.add(m[1])
  }
  return ids
}

export async function installPreset(presetId: string) {
  const preset = RULE_PRESETS.find((p) => p.id === presetId)
  if (!preset) return { ok: false, error: "Unknown preset" }

  // Avoid duplicates
  const installed = await getInstalledPresetIds()
  if (installed.has(presetId)) return { ok: true, alreadyInstalled: true }

  const now = new Date().toISOString()
  await db.insert(rules).values({
    id: nanoid(),
    name: `${PRESET_PREFIX}[preset:${preset.id}] ${preset.name}`,
    triggerType: preset.triggerType,
    triggerConfig: JSON.stringify(preset.triggerConfig),
    actionType: preset.actionType,
    actionConfig: JSON.stringify(preset.actionConfig),
    enabled: true,
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath("/settings/rules")
  return { ok: true }
}

export async function uninstallPreset(presetId: string) {
  const all = await db.select().from(rules).all()
  const match = all.find((r) => r.name.includes(`[preset:${presetId}]`))
  if (!match) return { ok: true, alreadyRemoved: true }

  await db.delete(rules).where(eq(rules.id, match.id))
  revalidatePath("/settings/rules")
  return { ok: true }
}

export async function listPresets(): Promise<
  Array<RulePreset & { installed: boolean }>
> {
  const installed = await getInstalledPresetIds()
  return RULE_PRESETS.map((p) => ({ ...p, installed: installed.has(p.id) }))
}
