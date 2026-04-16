"use server"

import { db } from "@/lib/db"
import { pomodoroSessions, tasks } from "@/lib/schema"
import { and, gte, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"

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
