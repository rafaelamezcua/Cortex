"use server"

import { db } from "@/lib/db"
import {
  projects,
  projectTasks,
  notes,
  calendarEvents,
  pomodoroSessions,
  journalEntries,
} from "@/lib/schema"
import { and, eq, gte, isNotNull, isNull, desc } from "drizzle-orm"

export type RecallItem = {
  kind: "task" | "note" | "event" | "focus" | "journal"
  id: string
  title: string
  meta: string // a short context line
  timestamp: string // ISO
  status?: string // for tasks
}

// "What was I doing here last?" — pulls the most recent activity tied to a
// given project. Heuristic match: project tasks (direct), notes whose title
// contains the project name (loose), journal entries that mention the project
// name (very loose), and pomodoro sessions linked by projectId.
export async function recallProjectActivity(
  projectId: string,
  limit = 8,
): Promise<RecallItem[]> {
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get()
  if (!project) return []

  const projectName = project.name
  const nameLower = projectName.toLowerCase()
  const items: RecallItem[] = []

  // Direct project tasks (most recent updates)
  const projTasks = await db
    .select()
    .from(projectTasks)
    .where(
      and(
        eq(projectTasks.projectId, projectId),
        isNull(projectTasks.archivedAt),
      ),
    )
    .orderBy(desc(projectTasks.updatedAt))
    .limit(limit)
    .all()
  for (const t of projTasks) {
    items.push({
      kind: "task",
      id: t.id,
      title: t.title,
      meta: `${t.status === "done" ? "Completed" : t.status === "in_progress" ? "In progress" : "To do"}${t.dueDate ? ` · due ${t.dueDate}` : ""}`,
      timestamp: t.updatedAt,
      status: t.status,
    })
  }

  // Pomodoro sessions linked to this project
  const sessions = await db
    .select()
    .from(pomodoroSessions)
    .where(eq(pomodoroSessions.projectId, projectId))
    .orderBy(desc(pomodoroSessions.completedAt))
    .limit(5)
    .all()
  for (const s of sessions) {
    const minutes = Math.round(s.duration / 60)
    items.push({
      kind: "focus",
      id: s.id,
      title: `Focus session (${minutes}m)`,
      meta: "Pomodoro completed",
      timestamp: s.completedAt,
    })
  }

  // Notes whose title or content contains project name (last 30 days)
  const allNotes = await db.select().from(notes).orderBy(desc(notes.updatedAt)).all()
  const matchingNotes = allNotes
    .filter(
      (n) =>
        n.title.toLowerCase().includes(nameLower) ||
        (n.content?.toLowerCase().includes(nameLower) ?? false),
    )
    .slice(0, 5)
  for (const n of matchingNotes) {
    items.push({
      kind: "note",
      id: n.id,
      title: n.title,
      meta: "Note",
      timestamp: n.updatedAt,
    })
  }

  // Calendar events whose title contains project name (recent + upcoming)
  const allEvents = await db
    .select()
    .from(calendarEvents)
    .orderBy(desc(calendarEvents.startTime))
    .all()
  const matchingEvents = allEvents
    .filter((e) => e.title.toLowerCase().includes(nameLower))
    .slice(0, 5)
  for (const e of matchingEvents) {
    const isPast = new Date(e.endTime) < new Date()
    items.push({
      kind: "event",
      id: e.id,
      title: e.title,
      meta: isPast ? `Past · ${e.startTime.split("T")[0]}` : `Upcoming · ${e.startTime.split("T")[0]}`,
      timestamp: e.startTime,
    })
  }

  // Journal entries that mention project (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyAgoStr = thirtyDaysAgo.toISOString()
  const recentJournal = await db
    .select()
    .from(journalEntries)
    .where(and(gte(journalEntries.updatedAt, thirtyAgoStr), isNotNull(journalEntries.content)))
    .orderBy(desc(journalEntries.updatedAt))
    .all()
  const matchingJournal = recentJournal
    .filter((j) => (j.content?.toLowerCase().includes(nameLower) ?? false))
    .slice(0, 3)
  for (const j of matchingJournal) {
    // Pull the sentence containing the project mention as preview
    const content = j.content || ""
    const sentences = content.split(/[.!?\n]/)
    const hit = sentences.find((s) => s.toLowerCase().includes(nameLower))
    items.push({
      kind: "journal",
      id: j.id,
      title: hit?.trim().slice(0, 100) || `Journal entry from ${j.date}`,
      meta: `Journal · ${j.date}`,
      timestamp: j.updatedAt,
    })
  }

  // Sort all by timestamp desc, then trim
  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return items.slice(0, limit)
}
