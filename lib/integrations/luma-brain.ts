import fs from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const VAULT_PATH = process.env.LUMA_BRAIN_PATH || "C:\\Users\\ramez\\luma-brain"

export interface DailyBrief {
  date: string
  exists: boolean
  tasks: { text: string; done: boolean; due: string | null; tags: string[] }[]
  wins: string[]
  raw: string | null
}

function getDailyNotePath(date: string): string {
  return path.join(VAULT_PATH, "Daily Notes", `${date}.md`)
}

function parseSection(content: string, heading: string): string {
  // Match "## Heading" through the next "## " or end of file
  const pattern = new RegExp(
    `##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    "i"
  )
  const match = content.match(pattern)
  return match?.[1]?.trim() ?? ""
}

function parseTasks(tasksSection: string): DailyBrief["tasks"] {
  if (!tasksSection) return []

  const lines = tasksSection.split("\n")
  const tasks: DailyBrief["tasks"] = []

  for (const line of lines) {
    // Match checkbox lines: - [ ] or - [x]
    const match = line.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/)
    if (!match) continue

    const done = match[1].toLowerCase() === "x"
    let text = match[2].trim()

    // Extract due date (e.g. "**2026-04-14**" or "**2026-04-14 (Mon 10:10 AM)**")
    const dueMatch = text.match(/\*\*(\d{4}-\d{2}-\d{2})(?:\s*\([^)]*\))?\*\*/)
    const due = dueMatch?.[1] ?? null

    // Extract hashtags
    const tags: string[] = []
    const tagRegex = /#([\w-]+)/g
    let tagMatch: RegExpExecArray | null
    while ((tagMatch = tagRegex.exec(text)) !== null) {
      tags.push(tagMatch[1])
    }

    // Clean the display text: strip the due date prefix and hashtags
    text = text
      .replace(/\*\*\d{4}-\d{2}-\d{2}(?:\s*\([^)]*\))?\*\*\s*-?\s*/, "")
      .replace(/#[\w-]+/g, "")
      .trim()

    tasks.push({ text, done, due, tags })
  }

  return tasks
}

function parseWins(winsSection: string): string[] {
  if (!winsSection) return []

  return winsSection
    .split("\n")
    .map((line) => line.match(/^\s*-\s*(.+)$/)?.[1]?.trim())
    .filter((w): w is string => !!w)
}

export async function getDailyBrief(date?: string): Promise<DailyBrief> {
  const today = date || getTodayDate()
  const filePath = getDailyNotePath(today)

  try {
    const content = await fs.readFile(filePath, "utf-8")
    const tasksSection = parseSection(content, "Tasks Extracted")
    const winsSection = parseSection(content, "Wins")

    return {
      date: today,
      exists: true,
      tasks: parseTasks(tasksSection),
      wins: parseWins(winsSection),
      raw: content,
    }
  } catch {
    return {
      date: today,
      exists: false,
      tasks: [],
      wins: [],
      raw: null,
    }
  }
}

function getTodayDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export async function isVaultAvailable(): Promise<boolean> {
  try {
    await fs.access(VAULT_PATH)
    return true
  } catch {
    return false
  }
}

export function isVaultConfigured(): boolean {
  // Trust either an explicit env var OR an accessible fallback path on disk —
  // a personal-app shouldn't require .env setup on every clone.
  return existsSync(VAULT_PATH)
}

// ============================================================
// Write path — attach Luma content to the Obsidian vault
// ============================================================

async function ensureDir(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch {
    // Ignore — recursive mkdir is idempotent
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
}

function formatFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = ["---"]
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === false) continue
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => `"${v}"`).join(", ")}]`)
    } else if (typeof value === "string") {
      lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`)
    } else {
      lines.push(`${key}: ${value}`)
    }
  }
  lines.push("---")
  return lines.join("\n")
}

export type VaultWriteResult =
  | { ok: true; path: string; relativePath: string }
  | { ok: false; error: string }

export async function saveNoteToVault(params: {
  title: string
  content: string
  pinned?: boolean
  updatedAt: string
}): Promise<VaultWriteResult> {
  if (!(await isVaultAvailable())) {
    return { ok: false, error: "Vault not available" }
  }

  const notesDir = path.join(VAULT_PATH, "Resources", "Luma Notes")
  await ensureDir(notesDir)

  const safeName = sanitizeFilename(params.title) || "untitled"
  const date = params.updatedAt.split("T")[0]
  const filename = `${date}-${safeName}.md`
  const filePath = path.join(notesDir, filename)

  const frontmatter = formatFrontmatter({
    source: "luma",
    title: params.title,
    date,
    pinned: params.pinned,
    tags: ["luma-note"],
  })

  const body = `${frontmatter}\n\n# ${params.title}\n\n${params.content}\n`

  try {
    await fs.writeFile(filePath, body, "utf-8")
    return {
      ok: true,
      path: filePath,
      relativePath: `Resources/Luma Notes/${filename}`,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function saveJournalToVault(params: {
  date: string
  content: string
  mood: number | null
}): Promise<VaultWriteResult> {
  if (!(await isVaultAvailable())) {
    return { ok: false, error: "Vault not available" }
  }

  const dailyDir = path.join(VAULT_PATH, "Daily Notes")
  await ensureDir(dailyDir)
  const dailyPath = path.join(dailyDir, `${params.date}.md`)

  const moodLabels = ["Rough", "Meh", "Okay", "Good", "Great"]
  const moodLabel =
    params.mood && params.mood >= 1 && params.mood <= 5
      ? moodLabels[params.mood - 1]
      : null

  const journalSection = [
    "## Journal",
    moodLabel ? `*Mood: ${moodLabel}*` : null,
    "",
    params.content.trim(),
  ]
    .filter((line) => line !== null)
    .join("\n")

  try {
    let existing = ""
    try {
      existing = await fs.readFile(dailyPath, "utf-8")
    } catch {
      // File doesn't exist — create with frontmatter
      const frontmatter = formatFrontmatter({
        date: params.date,
        tags: ["daily"],
      })
      existing = `${frontmatter}\n\n# ${params.date} Daily Note\n`
    }

    // Replace existing Journal section if present, else append
    const journalRegex = /\n##\s+Journal\s*\n[\s\S]*?(?=\n##\s|$)/
    let updated: string
    if (journalRegex.test(existing)) {
      updated = existing.replace(journalRegex, `\n${journalSection}\n`)
    } else {
      updated = `${existing.trimEnd()}\n\n${journalSection}\n`
    }

    await fs.writeFile(dailyPath, updated, "utf-8")
    return {
      ok: true,
      path: dailyPath,
      relativePath: `Daily Notes/${params.date}.md`,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function saveTaskToVault(params: {
  id: string
  title: string
  done: boolean
  dueDate: string | null
  priority: string
}): Promise<VaultWriteResult> {
  if (!(await isVaultAvailable())) {
    return { ok: false, error: "Vault not available" }
  }

  const today = getTodayDate()
  const dailyDir = path.join(VAULT_PATH, "Daily Notes")
  await ensureDir(dailyDir)
  const dailyPath = path.join(dailyDir, `${today}.md`)

  const checkbox = params.done ? "[x]" : "[ ]"
  const dueLabel = params.dueDate ? `**${params.dueDate}** ` : ""
  const priorityTag = params.priority === "high" ? " #high" : ""
  const marker = `<!-- luma:${params.id} -->`
  const taskLine = `- ${checkbox} ${dueLabel}${params.title}${priorityTag} ${marker}`

  try {
    let existing = ""
    try {
      existing = await fs.readFile(dailyPath, "utf-8")
    } catch {
      const frontmatter = formatFrontmatter({
        date: today,
        tags: ["daily"],
      })
      existing = `${frontmatter}\n\n# ${today} Daily Note\n`
    }

    // If a line with this task's marker already exists, replace it in place
    const markerRegex = new RegExp(
      `^-\\s*\\[[ xX]\\].*${escapeRegex(marker)}\\s*$`,
      "m"
    )
    if (markerRegex.test(existing)) {
      existing = existing.replace(markerRegex, taskLine)
    } else {
      // Append under "## Tasks Extracted" or create the section
      const sectionRegex = /(\n##\s+Tasks Extracted\s*\n)([\s\S]*?)(?=\n##\s|$)/
      if (sectionRegex.test(existing)) {
        existing = existing.replace(sectionRegex, (_, header, body) => {
          return `${header}${body.trimEnd()}\n${taskLine}\n`
        })
      } else {
        existing = `${existing.trimEnd()}\n\n## Tasks Extracted\n${taskLine}\n`
      }
    }

    await fs.writeFile(dailyPath, existing, "utf-8")
    return {
      ok: true,
      path: dailyPath,
      relativePath: `Daily Notes/${today}.md`,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function saveChatToVault(params: {
  title: string
  messages: { role: "user" | "assistant"; content: string }[]
  startedAt: string
}): Promise<VaultWriteResult> {
  if (!(await isVaultAvailable())) {
    return { ok: false, error: "Vault not available" }
  }

  const chatsDir = path.join(VAULT_PATH, "Resources", "Luma Chats")
  await ensureDir(chatsDir)

  const safeName = sanitizeFilename(params.title) || "conversation"
  const date = params.startedAt.split("T")[0]
  const filename = `${date}-${safeName}.md`
  const filePath = path.join(chatsDir, filename)

  const frontmatter = formatFrontmatter({
    source: "luma-chat",
    title: params.title,
    date,
    tags: ["luma-chat"],
  })

  const transcript = params.messages
    .map((m) => {
      const speaker = m.role === "user" ? "**Rafael**" : "**Luma**"
      return `${speaker}\n\n${m.content}`
    })
    .join("\n\n---\n\n")

  const body = `${frontmatter}\n\n# ${params.title}\n\n${transcript}\n`

  try {
    await fs.writeFile(filePath, body, "utf-8")
    return {
      ok: true,
      path: filePath,
      relativePath: `Resources/Luma Chats/${filename}`,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
