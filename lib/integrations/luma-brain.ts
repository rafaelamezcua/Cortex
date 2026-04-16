import fs from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const VAULT_PATH = process.env.LUMA_BRAIN_PATH || "C:\\Users\\ramez\\luma-brain"

// GitHub-backed vault (used on remote deploys where the laptop's filesystem
// isn't reachable). Set both LUMA_BRAIN_REPO ("owner/repo") and
// LUMA_BRAIN_GITHUB_TOKEN to switch into GitHub mode. Token needs
// Contents: Read & Write to commit edits back to the vault.
const GH_REPO = process.env.LUMA_BRAIN_REPO
const GH_TOKEN = process.env.LUMA_BRAIN_GITHUB_TOKEN
const GH_BRANCH = process.env.LUMA_BRAIN_BRANCH || "main"

function isGitHubMode(): boolean {
  return Boolean(GH_REPO && GH_TOKEN)
}

function ghContentsUrl(relativePath: string): string {
  const encoded = relativePath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/")
  return `https://api.github.com/repos/${GH_REPO}/contents/${encoded}`
}

interface VaultFile {
  content: string
  // GitHub blob SHA. Required when updating an existing file via the
  // contents API; null on the filesystem backend.
  sha: string | null
}

/** Returns the file's content + sha, or null if missing. */
async function readVaultFile(relativePath: string): Promise<VaultFile | null> {
  if (isGitHubMode()) {
    const url = `${ghContentsUrl(relativePath)}?ref=${GH_BRANCH}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "cortex-luma-brain",
      },
      cache: "no-store",
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`GitHub ${res.status} for ${relativePath}`)
    const json = (await res.json()) as { content: string; sha: string; encoding: string }
    const content = Buffer.from(json.content, "base64").toString("utf-8")
    return { content, sha: json.sha }
  }
  try {
    const fullPath = path.join(VAULT_PATH, relativePath)
    const content = await fs.readFile(fullPath, "utf-8")
    return { content, sha: null }
  } catch {
    return null
  }
}

/** Create or overwrite a file. `sha` must be supplied when updating an existing GitHub file. */
async function writeVaultFile(
  relativePath: string,
  content: string,
  sha: string | null
): Promise<void> {
  if (isGitHubMode()) {
    const action = sha ? "Update" : "Add"
    const body = {
      message: `${action} ${relativePath} (via Cortex)`,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch: GH_BRANCH,
      ...(sha ? { sha } : {}),
    }
    const res = await fetch(ghContentsUrl(relativePath), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "cortex-luma-brain",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      throw new Error(`GitHub PUT ${res.status} for ${relativePath}: ${detail.slice(0, 200)}`)
    }
    return
  }
  const fullPath = path.join(VAULT_PATH, relativePath)
  await ensureDir(path.dirname(fullPath))
  await fs.writeFile(fullPath, content, "utf-8")
}

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

  try {
    const file = await readVaultFile(`Daily Notes/${today}.md`)
    if (!file) {
      return { date: today, exists: false, tasks: [], wins: [], raw: null }
    }
    const tasksSection = parseSection(file.content, "Tasks Extracted")
    const winsSection = parseSection(file.content, "Wins")

    return {
      date: today,
      exists: true,
      tasks: parseTasks(tasksSection),
      wins: parseWins(winsSection),
      raw: file.content,
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
  if (isGitHubMode()) return true
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
  if (isGitHubMode()) return true
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

  const safeName = sanitizeFilename(params.title) || "untitled"
  const date = params.updatedAt.split("T")[0]
  const filename = `${date}-${safeName}.md`
  const relativePath = `Resources/Luma Notes/${filename}`

  const frontmatter = formatFrontmatter({
    source: "luma",
    title: params.title,
    date,
    pinned: params.pinned,
    tags: ["luma-note"],
  })

  const body = `${frontmatter}\n\n# ${params.title}\n\n${params.content}\n`

  try {
    const existing = await readVaultFile(relativePath)
    await writeVaultFile(relativePath, body, existing?.sha ?? null)
    return {
      ok: true,
      path: isGitHubMode() ? relativePath : path.join(VAULT_PATH, relativePath),
      relativePath,
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

  const relativePath = `Daily Notes/${params.date}.md`

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
    const existingFile = await readVaultFile(relativePath)
    let existing: string
    if (existingFile) {
      existing = existingFile.content
    } else {
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

    await writeVaultFile(relativePath, updated, existingFile?.sha ?? null)
    return {
      ok: true,
      path: isGitHubMode() ? relativePath : path.join(VAULT_PATH, relativePath),
      relativePath,
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
  const relativePath = `Daily Notes/${today}.md`

  const checkbox = params.done ? "[x]" : "[ ]"
  const dueLabel = params.dueDate ? `**${params.dueDate}** ` : ""
  const priorityTag = params.priority === "high" ? " #high" : ""
  const marker = `<!-- luma:${params.id} -->`
  const taskLine = `- ${checkbox} ${dueLabel}${params.title}${priorityTag} ${marker}`

  try {
    const existingFile = await readVaultFile(relativePath)
    let existing: string
    if (existingFile) {
      existing = existingFile.content
    } else {
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

    await writeVaultFile(relativePath, existing, existingFile?.sha ?? null)
    return {
      ok: true,
      path: isGitHubMode() ? relativePath : path.join(VAULT_PATH, relativePath),
      relativePath,
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

  const safeName = sanitizeFilename(params.title) || "conversation"
  const date = params.startedAt.split("T")[0]
  const filename = `${date}-${safeName}.md`
  const relativePath = `Resources/Luma Chats/${filename}`

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
    const existing = await readVaultFile(relativePath)
    await writeVaultFile(relativePath, body, existing?.sha ?? null)
    return {
      ok: true,
      path: isGitHubMode() ? relativePath : path.join(VAULT_PATH, relativePath),
      relativePath,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
