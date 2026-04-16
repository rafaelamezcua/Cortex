"use server"

import { db } from "@/lib/db"
import { pomodoroSessions, tasks } from "@/lib/schema"
import { and, gte, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { getEventsForRange } from "@/lib/actions/calendar"
import { getGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"

export type WeekSession = {
  id: string
  taskId: string | null
  projectId: string | null
  duration: number
  completedAt: string
}

export type WeekTaskBreakdown = {
  taskId: string | null
  taskTitle: string | null
  sessionCount: number
  totalSeconds: number
}

export type WeekStats = {
  sessionCount: number
  totalMinutes: number
  totalSeconds: number
  tasks: WeekTaskBreakdown[]
  weekStartIso: string
}

export async function createPomodoroSession(params: {
  durationSeconds: number
  taskId?: string | null
}) {
  const duration = Math.max(1, Math.round(params.durationSeconds))
  const taskId = params.taskId?.trim() ? params.taskId : null

  await db.insert(pomodoroSessions).values({
    id: nanoid(),
    taskId,
    projectId: null,
    duration,
    completedAt: new Date().toISOString(),
  })

  revalidatePath("/focus")
}

/**
 * Returns the ISO date (YYYY-MM-DDTHH:mm:ss...) for the start of the current week.
 * Week starts Monday 00:00 in the server's local timezone.
 */
function getWeekStart(now: Date): Date {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  // Monday as first day. JS: 0 Sun, 1 Mon, ..., 6 Sat.
  const day = start.getDay()
  const diff = day === 0 ? 6 : day - 1
  start.setDate(start.getDate() - diff)
  return start
}

export async function getWeekStats(): Promise<WeekStats> {
  const now = new Date()
  const weekStart = getWeekStart(now)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const startIso = weekStart.toISOString()
  const endIso = weekEnd.toISOString()

  const rows = await db
    .select()
    .from(pomodoroSessions)
    .where(
      and(
        gte(pomodoroSessions.completedAt, startIso),
        lte(pomodoroSessions.completedAt, endIso)
      )
    )
    .all()

  const totalSeconds = rows.reduce((sum, r) => sum + (r.duration || 0), 0)

  // Aggregate by task
  const byTask = new Map<string | null, { count: number; seconds: number }>()
  for (const r of rows) {
    const key = r.taskId ?? null
    const curr = byTask.get(key) ?? { count: 0, seconds: 0 }
    curr.count += 1
    curr.seconds += r.duration || 0
    byTask.set(key, curr)
  }

  // Fetch titles for linked tasks
  const taskIds = [...byTask.keys()].filter((k): k is string => !!k)
  let titles = new Map<string, string>()
  if (taskIds.length > 0) {
    const all = await db.select().from(tasks).all()
    titles = new Map(
      all.filter((t) => taskIds.includes(t.id)).map((t) => [t.id, t.title])
    )
  }

  const breakdown: WeekTaskBreakdown[] = [...byTask.entries()]
    .map(([taskId, val]) => ({
      taskId,
      taskTitle: taskId ? titles.get(taskId) ?? "Untitled task" : null,
      sessionCount: val.count,
      totalSeconds: val.seconds,
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds)

  return {
    sessionCount: rows.length,
    totalMinutes: Math.round(totalSeconds / 60),
    totalSeconds,
    tasks: breakdown,
    weekStartIso: startIso,
  }
}

/* ============================================================
   Find focus time
   ============================================================ */

export type FocusBlock = {
  start: string // "YYYY-MM-DDTHH:mm"
  end: string // "YYYY-MM-DDTHH:mm"
  minutes: number
}

export type FindFocusBlocksInput = {
  date?: string // "YYYY-MM-DD"
  minMinutes?: number
  dayStartHour?: number
  dayEndHour?: number
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function tomorrowLocal(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function formatLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function toLocalDate(iso: string): Date {
  // Accepts either "YYYY-MM-DDTHH:mm(:ss)?" (local, no tz) or full ISO with "Z"/offset.
  // For naked local timestamps, `new Date(str)` parses them as local in most engines.
  // For timestamps with offset, it uses the offset. Either way, the returned Date
  // is comparable in absolute time and we render it in the user's local TZ.
  return new Date(iso)
}

export async function findFocusBlocks(
  input: FindFocusBlocksInput = {}
): Promise<FocusBlock[]> {
  const date = input.date?.trim() || tomorrowLocal()
  const minMinutes = Math.max(5, Math.round(input.minMinutes ?? 90))
  const dayStartHour = Math.min(
    23,
    Math.max(0, Math.round(input.dayStartHour ?? 9))
  )
  const dayEndHour = Math.min(
    24,
    Math.max(dayStartHour + 1, Math.round(input.dayEndHour ?? 18))
  )

  // Window bounds in local time.
  const [y, m, d] = date.split("-").map(Number)
  if (!y || !m || !d) return []
  const windowStart = new Date(y, m - 1, d, dayStartHour, 0, 0, 0)
  const windowEnd = new Date(y, m - 1, d, dayEndHour, 0, 0, 0)

  // Read local events across the whole day so all-day overlaps are caught.
  const dayStartStr = `${date}T00:00:00`
  const dayEndStr = `${date}T23:59:59`
  const localEvents = await getEventsForRange(dayStartStr, dayEndStr)

  type Busy = { start: Date; end: Date; allDay: boolean }
  const busy: Busy[] = localEvents.map((e) => ({
    start: toLocalDate(e.startTime),
    end: toLocalDate(e.endTime || e.startTime),
    allDay: !!e.allDay,
  }))

  // Google events (if connected).
  const connected = await isGoogleConnected()
  if (connected) {
    try {
      const gEvents = await getGoogleCalendarEvents(
        new Date(y, m - 1, d, 0, 0, 0).toISOString(),
        new Date(y, m - 1, d, 23, 59, 59).toISOString()
      )
      // Skip any Google event whose id matches a local event's googleEventId
      // to avoid double-counting synced entries.
      const syncedIds = new Set(
        localEvents
          .filter((e) => e.googleEventId)
          .map((e) => `gcal-${e.googleEventId}`)
      )
      for (const g of gEvents) {
        if (syncedIds.has(g.id)) continue
        busy.push({
          start: toLocalDate(g.startTime),
          end: toLocalDate(g.endTime || g.startTime),
          allDay: !!g.allDay,
        })
      }
    } catch {
      // Google failed — fall back to local only.
    }
  }

  // If anything is all-day on this date, treat it as fully busy.
  if (busy.some((b) => b.allDay)) return []

  // Clamp to window and drop non-overlapping.
  const clipped: { start: Date; end: Date }[] = []
  for (const b of busy) {
    const s = b.start < windowStart ? windowStart : b.start
    const e = b.end > windowEnd ? windowEnd : b.end
    if (e > s) clipped.push({ start: s, end: e })
  }

  // Sort by start, merge overlaps.
  clipped.sort((a, b) => a.start.getTime() - b.start.getTime())
  const merged: { start: Date; end: Date }[] = []
  for (const c of clipped) {
    const last = merged[merged.length - 1]
    if (last && c.start <= last.end) {
      if (c.end > last.end) last.end = c.end
    } else {
      merged.push({ start: new Date(c.start), end: new Date(c.end) })
    }
  }

  // Find gaps >= minMinutes.
  const gaps: FocusBlock[] = []
  let cursor = windowStart
  for (const m2 of merged) {
    if (m2.start > cursor) {
      const minutes = Math.floor(
        (m2.start.getTime() - cursor.getTime()) / 60000
      )
      if (minutes >= minMinutes) {
        gaps.push({
          start: formatLocal(cursor),
          end: formatLocal(m2.start),
          minutes,
        })
      }
    }
    if (m2.end > cursor) cursor = m2.end
  }
  if (cursor < windowEnd) {
    const minutes = Math.floor(
      (windowEnd.getTime() - cursor.getTime()) / 60000
    )
    if (minutes >= minMinutes) {
      gaps.push({
        start: formatLocal(cursor),
        end: formatLocal(windowEnd),
        minutes,
      })
    }
  }

  // Longest first, cap 5.
  gaps.sort((a, b) => b.minutes - a.minutes)
  return gaps.slice(0, 5)
}
