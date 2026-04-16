"use server"

import { db } from "@/lib/db"
import {
  tasks,
  calendarEvents,
  habits,
  habitLogs,
  journalEntries,
  pomodoroSessions,
} from "@/lib/schema"
import { and, eq, gte, lte, ne } from "drizzle-orm"
import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { getGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"
import {
  isVaultAvailable,
  isVaultConfigured,
  saveJournalToVault,
} from "@/lib/integrations/luma-brain"
import { saveJournalEntry } from "@/lib/actions/journal"

// ---------- Date helpers (local time, YYYY-MM-DD) ----------

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

// ============================================================
// Luma strip signals
// ============================================================

export type LumaNudge = {
  id: string
  tone: "gentle" | "alert" | "celebrate" | "info"
  message: string
  cta?: { label: string; href: string }
}

export async function getLumaStripSignals(): Promise<LumaNudge[]> {
  const nudges: LumaNudge[] = []
  const now = new Date()
  const todayStr = formatLocalDate(now)

  // ---- Signal 1: No journal entries in last 3 days ----
  try {
    const threeDaysAgo = formatLocalDate(addDays(now, -3))
    const recent = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          gte(journalEntries.date, threeDaysAgo),
          lte(journalEntries.date, todayStr)
        )
      )
      .all()

    const hasContent = recent.some(
      (e) => e.content && e.content.trim().length > 0
    )
    if (!hasContent) {
      nudges.push({
        id: "journal-dry-spell",
        tone: "gentle",
        message:
          "It's been a few days since you wrote anything. 2 minutes?",
        cta: { label: "Open journal", href: "/journal" },
      })
    }
  } catch {
    // Silently skip if the table read fails
  }

  // ---- Signal 2: Overdue tasks ----
  try {
    const activeTasks = await db
      .select()
      .from(tasks)
      .where(ne(tasks.status, "done"))
      .all()

    const overdue = activeTasks.filter(
      (t) => t.dueDate && t.dueDate < todayStr
    )
    if (overdue.length > 0) {
      nudges.push({
        id: "tasks-overdue",
        tone: "alert",
        message: `${overdue.length} task${overdue.length === 1 ? "" : "s"} overdue. Reschedule or knock ${overdue.length === 1 ? "it" : "them"} out?`,
        cta: { label: "See tasks", href: "/tasks" },
      })
    }
  } catch {
    // Silent skip
  }

  // ---- Signal 3: Heavy day tomorrow (>4 events) ----
  try {
    const tomorrow = addDays(now, 1)
    const tomorrowStr = formatLocalDate(tomorrow)
    const dayStart = `${tomorrowStr}T00:00:00`
    const dayEnd = `${tomorrowStr}T23:59:59`

    const localRows = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          lte(calendarEvents.startTime, dayEnd),
          gte(calendarEvents.endTime, dayStart)
        )
      )
      .all()
    let totalCount = localRows.length

    if (await isGoogleConnected()) {
      try {
        const googleEvents = await getGoogleCalendarEvents(
          new Date(dayStart).toISOString(),
          new Date(dayEnd).toISOString()
        )
        totalCount += googleEvents.length
      } catch {
        // fall back to local-only count
      }
    }

    if (totalCount > 4) {
      nudges.push({
        id: "heavy-day-tomorrow",
        tone: "info",
        message: `Tomorrow is packed (${totalCount} events). Protect a block?`,
        cta: { label: "Plan tomorrow", href: "/calendar" },
      })
    }
  } catch {
    // Silent skip
  }

  // ---- Signal 4: Streak milestone today (7 / 14 / 30) ----
  try {
    const allHabits = await db.select().from(habits).all()
    if (allHabits.length > 0) {
      const lookback = 35 // enough for a 30-day streak check
      const startStr = formatLocalDate(addDays(now, -lookback))
      const logs = await db
        .select()
        .from(habitLogs)
        .where(
          and(
            gte(habitLogs.date, startStr),
            lte(habitLogs.date, todayStr)
          )
        )
        .all()

      // Index logs by habitId -> Set of dates
      const byHabit = new Map<string, Set<string>>()
      for (const l of logs) {
        if (!byHabit.has(l.habitId)) byHabit.set(l.habitId, new Set())
        byHabit.get(l.habitId)!.add(l.date)
      }

      for (const h of allHabits) {
        const dates = byHabit.get(h.id)
        if (!dates || !dates.has(todayStr)) continue

        // Count consecutive days back from today
        let streak = 0
        const cursor = new Date(now)
        for (let i = 0; i <= lookback; i++) {
          const dStr = formatLocalDate(cursor)
          if (dates.has(dStr)) {
            streak++
            cursor.setDate(cursor.getDate() - 1)
          } else {
            break
          }
        }

        if (streak === 7 || streak === 14 || streak === 30) {
          nudges.push({
            id: `streak-${h.id}-${streak}`,
            tone: "celebrate",
            message: `${streak}-day streak on ${h.name}. That's momentum.`,
            cta: { label: "See habits", href: "/habits" },
          })
          break // one streak nudge is plenty
        }
      }
    }
  } catch {
    // Silent skip
  }

  // ---- Signal 5: Evening review CTA (after 6pm, no review yet) ----
  try {
    const hour = now.getHours()
    if (hour >= 18) {
      const todayEntry = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.date, todayStr))
        .get()

      const done =
        !!todayEntry && !!todayEntry.content && todayEntry.content.trim().length > 0
      if (!done) {
        nudges.push({
          id: "evening-review",
          tone: "gentle",
          message: "Wind down? I'll draft today's journal with you.",
          cta: { label: "Review today", href: "/reviews/today" },
        })
      }
    }
  } catch {
    // Silent skip
  }

  // Cap at 3. Order: alert > celebrate > gentle/info keeps priorities natural
  // but we preserve insertion order; overdue naturally comes early.
  return nudges.slice(0, 3)
}

// ============================================================
// Evening review — today's data + AI draft
// ============================================================

export type TodayReviewData = {
  date: string
  completedTasks: { id: string; title: string }[]
  eventsAttended: { title: string; startTime: string; endTime: string }[]
  habitsLogged: { name: string; count: number; target: number }[]
  journalExists: boolean
  journalContent: string
  focusMinutes: number
}

export async function getTodayReviewData(): Promise<TodayReviewData> {
  const now = new Date()
  const todayStr = formatLocalDate(now)
  const dayStart = `${todayStr}T00:00:00`
  const dayEnd = `${todayStr}T23:59:59`

  // Completed tasks updated today (mirrors existing dashboard logic)
  const allTasks = await db.select().from(tasks).all()
  const todayDateOnly = now.toDateString()
  const completedTasks = allTasks
    .filter(
      (t) =>
        t.status === "done" &&
        new Date(t.updatedAt).toDateString() === todayDateOnly
    )
    .map((t) => ({ id: t.id, title: t.title }))

  // Events whose end time is past "now" and started today = attended
  const localEvents = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        lte(calendarEvents.startTime, dayEnd),
        gte(calendarEvents.endTime, dayStart)
      )
    )
    .orderBy(calendarEvents.startTime)
    .all()

  let allEvents = localEvents.map((e) => ({
    title: e.title,
    startTime: e.startTime,
    endTime: e.endTime,
    allDay: e.allDay,
  }))

  if (await isGoogleConnected()) {
    try {
      const googleEvents = await getGoogleCalendarEvents(
        new Date(dayStart).toISOString(),
        new Date(dayEnd).toISOString()
      )
      allEvents = [
        ...allEvents,
        ...googleEvents.map((e) => ({
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          allDay: e.allDay,
        })),
      ]
    } catch {
      // fall back to local only
    }
  }

  const nowIso = now.toISOString()
  const eventsAttended = allEvents
    .filter((e) => !e.allDay)
    .filter((e) => {
      // Include events that have ended (or started) already today
      const end = new Date(e.endTime)
      return !isNaN(end.getTime()) && end.toISOString() <= nowIso
    })
    .map((e) => ({
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
    }))

  // Habits logged today
  const allHabits = await db.select().from(habits).all()
  const todayLogs = await db
    .select()
    .from(habitLogs)
    .where(eq(habitLogs.date, todayStr))
    .all()

  const logByHabit = new Map<string, number>()
  for (const l of todayLogs) {
    logByHabit.set(l.habitId, (logByHabit.get(l.habitId) ?? 0) + l.count)
  }

  const habitsLogged = allHabits
    .filter((h) => logByHabit.has(h.id))
    .map((h) => ({
      name: h.name,
      count: logByHabit.get(h.id) ?? 0,
      target: h.targetPerDay,
    }))

  // Focus: pomodoro sessions today
  const pomodoros = await db
    .select()
    .from(pomodoroSessions)
    .where(
      and(
        gte(pomodoroSessions.completedAt, dayStart),
        lte(pomodoroSessions.completedAt, `${todayStr}T23:59:59.999`)
      )
    )
    .all()
  const focusSeconds = pomodoros.reduce((s, p) => s + (p.duration || 0), 0)
  const focusMinutes = Math.round(focusSeconds / 60)

  // Journal
  const entry = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.date, todayStr))
    .get()
  const journalContent = entry?.content || ""

  return {
    date: todayStr,
    completedTasks,
    eventsAttended,
    habitsLogged,
    journalExists: !!entry,
    journalContent,
    focusMinutes,
  }
}

export async function generateTodayReviewDraft(): Promise<{
  ok: true
  draft: string
} | { ok: false; error: string }> {
  try {
    const data = await getTodayReviewData()

    const dateLabel = new Date(data.date + "T12:00:00").toLocaleDateString(
      "en-US",
      { weekday: "long", month: "long", day: "numeric" }
    )

    const taskLine =
      data.completedTasks.length > 0
        ? data.completedTasks.map((t) => `- ${t.title}`).join("\n")
        : "(none)"

    const eventLine =
      data.eventsAttended.length > 0
        ? data.eventsAttended.map((e) => `- ${e.title}`).join("\n")
        : "(none)"

    const habitLine =
      data.habitsLogged.length > 0
        ? data.habitsLogged
            .map((h) => `- ${h.name}: ${h.count}/${h.target}`)
            .join("\n")
        : "(none)"

    const prompt = `You are Luma, Rafael's warm personal assistant, helping him close out the day.

Draft a short journal entry in Rafael's voice (first person) summarizing today. The entry should:
- Be 3 to 5 short sentences max, plain prose, no markdown, no bullet lists, no headers.
- Mention 1 to 2 concrete things from the day's data. Don't list everything.
- Sound like a real person writing a quick journal at night. Warm, direct, a little reflective.
- End with one gentle reflection question for Rafael to answer if he wants.
- Never use em dashes.

Today is ${dateLabel}.

Completed tasks:
${taskLine}

Events attended:
${eventLine}

Habits logged:
${habitLine}

Focus time: ${data.focusMinutes} minutes

Journal already written today (may be empty):
${data.journalContent || "(nothing yet)"}

Output only the draft entry. No preamble.`

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
      maxOutputTokens: 400,
    })

    return { ok: true, draft: text.trim() }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Couldn't draft right now.",
    }
  }
}

export async function saveTodayReview(
  date: string,
  content: string
): Promise<void> {
  await saveJournalEntry(date, content)
}

// ============================================================
// Weekly digest
// ============================================================

export type WeeklyDigestData = {
  startDate: string
  endDate: string
  tasksCompleted: number
  habitCompletionPct: number | null
  focusMinutes: number
  journalEntriesWritten: number
  eventsAttended: number
  habitBreakdown: { name: string; completedDays: number; totalDays: number }[]
  topTasks: string[]
}

export async function getWeeklyDigestData(): Promise<WeeklyDigestData> {
  const now = new Date()
  const endDate = formatLocalDate(now)
  const startDateObj = addDays(now, -6) // inclusive of today = 7 days
  const startDate = formatLocalDate(startDateObj)
  const rangeStart = `${startDate}T00:00:00`
  const rangeEnd = `${endDate}T23:59:59.999`

  // Tasks completed in window
  const allTasks = await db.select().from(tasks).all()
  const completed = allTasks.filter((t) => {
    if (t.status !== "done") return false
    const updated = new Date(t.updatedAt)
    return updated >= startDateObj && updated <= now
  })
  const topTasks = completed
    .slice(-8)
    .map((t) => t.title)
    .reverse()

  // Habits
  const allHabits = await db.select().from(habits).all()
  const logs = await db
    .select()
    .from(habitLogs)
    .where(
      and(gte(habitLogs.date, startDate), lte(habitLogs.date, endDate))
    )
    .all()

  const logDatesByHabit = new Map<string, Set<string>>()
  for (const l of logs) {
    if (!logDatesByHabit.has(l.habitId))
      logDatesByHabit.set(l.habitId, new Set())
    logDatesByHabit.get(l.habitId)!.add(l.date)
  }

  const habitBreakdown = allHabits.map((h) => {
    const dates = logDatesByHabit.get(h.id) ?? new Set<string>()
    return {
      name: h.name,
      completedDays: dates.size,
      totalDays: 7,
    }
  })

  let habitCompletionPct: number | null = null
  if (allHabits.length > 0) {
    const totalPossible = allHabits.length * 7
    const totalDone = habitBreakdown.reduce(
      (s, h) => s + h.completedDays,
      0
    )
    habitCompletionPct = Math.round((totalDone / totalPossible) * 100)
  }

  // Focus — pomodoro sessions in window
  const pomos = await db
    .select()
    .from(pomodoroSessions)
    .where(
      and(
        gte(pomodoroSessions.completedAt, rangeStart),
        lte(pomodoroSessions.completedAt, rangeEnd)
      )
    )
    .all()
  const focusMinutes = Math.round(
    pomos.reduce((s, p) => s + (p.duration || 0), 0) / 60
  )

  // Journal entries written in window (non-empty)
  const entries = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        gte(journalEntries.date, startDate),
        lte(journalEntries.date, endDate)
      )
    )
    .all()
  const journalEntriesWritten = entries.filter(
    (e) => e.content && e.content.trim().length > 0
  ).length

  // Events attended: local events in window. Google included if connected.
  let eventsAttended = 0
  const localEvents = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        lte(calendarEvents.startTime, rangeEnd),
        gte(calendarEvents.endTime, rangeStart)
      )
    )
    .all()
  eventsAttended += localEvents.filter(
    (e) => new Date(e.endTime) <= now
  ).length

  if (await isGoogleConnected()) {
    try {
      const googleEvents = await getGoogleCalendarEvents(
        new Date(rangeStart).toISOString(),
        new Date(rangeEnd).toISOString()
      )
      eventsAttended += googleEvents.filter(
        (e) => new Date(e.endTime) <= now
      ).length
    } catch {
      // skip
    }
  }

  return {
    startDate,
    endDate,
    tasksCompleted: completed.length,
    habitCompletionPct,
    focusMinutes,
    journalEntriesWritten,
    eventsAttended,
    habitBreakdown,
    topTasks,
  }
}

export async function generateWeeklyDigest(): Promise<{
  ok: true
  summary: string
  patterns: string[]
  data: WeeklyDigestData
} | { ok: false; error: string }> {
  try {
    const data = await getWeeklyDigestData()

    const habitLines =
      data.habitBreakdown.length > 0
        ? data.habitBreakdown
            .map((h) => `- ${h.name}: ${h.completedDays}/${h.totalDays} days`)
            .join("\n")
        : "(none tracked)"
    const taskLines =
      data.topTasks.length > 0
        ? data.topTasks.map((t) => `- ${t}`).join("\n")
        : "(none)"

    const prompt = `You are Luma, Rafael's warm personal assistant, writing a gentle weekly digest.

Write a one-paragraph summary (3 to 4 sentences max) of Rafael's last 7 days. Warm, direct, addressed to "you" (second person). No markdown, no bullets, no headers, no em dashes.

Then, on separate lines after the paragraph, output exactly three short notable patterns or observations. Format:
PATTERNS:
1. ...
2. ...
3. ...

Keep each pattern to one sentence. Observations should be grounded in the data below. If a metric is zero, don't invent activity.

Window: ${data.startDate} to ${data.endDate}

Tasks completed: ${data.tasksCompleted}
Events attended: ${data.eventsAttended}
Focus minutes: ${data.focusMinutes}
Journal entries written: ${data.journalEntriesWritten}/7
Habit completion: ${data.habitCompletionPct !== null ? data.habitCompletionPct + "%" : "no habits tracked"}

Habit detail:
${habitLines}

Notable completed tasks:
${taskLines}

Output the paragraph first, then the PATTERNS block.`

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
      maxOutputTokens: 600,
    })

    const trimmed = text.trim()
    const patternsIdx = trimmed.search(/PATTERNS\s*:/i)
    let summary = trimmed
    let patterns: string[] = []
    if (patternsIdx !== -1) {
      summary = trimmed.slice(0, patternsIdx).trim()
      const patternsBlock = trimmed.slice(patternsIdx).replace(/^PATTERNS\s*:/i, "")
      patterns = patternsBlock
        .split("\n")
        .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
        .filter((l) => l.length > 0)
        .slice(0, 3)
    }

    return { ok: true, summary, patterns, data }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Couldn't draft the digest.",
    }
  }
}

export async function getVaultStatus(): Promise<{
  configured: boolean
  available: boolean
}> {
  const configured = isVaultConfigured()
  const available = configured ? await isVaultAvailable() : false
  return { configured, available }
}

export async function saveWeeklyDigestToVault(params: {
  startDate: string
  endDate: string
  summary: string
  patterns: string[]
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!(await isVaultAvailable())) {
    return { ok: false, error: "Vault not available" }
  }

  // Reuse journal vault writer: save under the endDate daily note as a
  // Weekly Digest section via the journal content block.
  const body = [
    `Weekly digest for ${params.startDate} to ${params.endDate}.`,
    "",
    params.summary,
    "",
    params.patterns.length > 0 ? "Notable patterns:" : "",
    ...params.patterns.map((p, i) => `${i + 1}. ${p}`),
  ]
    .filter((line) => line !== "")
    .join("\n")

  const result = await saveJournalToVault({
    date: params.endDate,
    content: body,
    mood: null,
  })

  if (result.ok) {
    return { ok: true, path: result.relativePath }
  }
  return { ok: false, error: result.error }
}

// ============================================================
// Smart reschedule — propose and apply new due dates for overdue tasks
// ============================================================

export type RescheduleProposal = {
  taskId: string
  title: string
  priority: "low" | "medium" | "high"
  oldDue: string
  newDue: string
}

// Spread overdue tasks across the next N weekdays starting from today.
// High priority: within 2 weekdays. Medium: within 5. Low: within 7.
function nextWeekdays(from: Date, count: number): string[] {
  const out: string[] = []
  const cursor = new Date(from)
  while (out.length < count) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) {
      out.push(formatLocalDate(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

export async function proposeReschedule(): Promise<RescheduleProposal[]> {
  const now = new Date()
  const todayStr = formatLocalDate(now)

  const active = await db
    .select()
    .from(tasks)
    .where(ne(tasks.status, "done"))
    .all()

  const overdue = active
    .filter((t) => t.dueDate && t.dueDate < todayStr)
    .filter((t) => !t.parentId) // skip subtasks — they follow parent
    .sort((a, b) => {
      // Priority first (high, medium, low), then oldest overdue first
      const rank: Record<string, number> = { high: 0, medium: 1, low: 2 }
      const pa = rank[a.priority] ?? 1
      const pb = rank[b.priority] ?? 1
      if (pa !== pb) return pa - pb
      return (a.dueDate || "").localeCompare(b.dueDate || "")
    })

  if (overdue.length === 0) return []

  // Precompute weekday slots for each priority window
  const slotsHigh = nextWeekdays(now, 2)
  const slotsMed = nextWeekdays(now, 5)
  const slotsLow = nextWeekdays(now, 7)

  // Track how many tasks we've placed per date to balance distribution
  const loadByDate = new Map<string, number>()
  function pick(slots: string[]): string {
    let best = slots[0]
    let bestLoad = loadByDate.get(best) ?? 0
    for (const s of slots) {
      const load = loadByDate.get(s) ?? 0
      if (load < bestLoad) {
        best = s
        bestLoad = load
      }
    }
    loadByDate.set(best, bestLoad + 1)
    return best
  }

  const proposals: RescheduleProposal[] = overdue.map((t) => {
    const slots =
      t.priority === "high"
        ? slotsHigh
        : t.priority === "low"
          ? slotsLow
          : slotsMed
    const newDue = pick(slots)
    return {
      taskId: t.id,
      title: t.title,
      priority: t.priority as "low" | "medium" | "high",
      oldDue: t.dueDate as string,
      newDue,
    }
  })

  return proposals
}

export async function applyReschedule(
  proposals: { taskId: string; newDue: string }[]
): Promise<{ updated: number }> {
  if (!proposals.length) return { updated: 0 }
  const now = new Date().toISOString()
  let updated = 0
  for (const p of proposals) {
    if (!p.taskId || !p.newDue) continue
    await db
      .update(tasks)
      .set({ dueDate: p.newDue, updatedAt: now })
      .where(eq(tasks.id, p.taskId))
    updated++
  }
  const { revalidatePath } = await import("next/cache")
  revalidatePath("/tasks")
  revalidatePath("/")
  return { updated }
}
