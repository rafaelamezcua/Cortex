// No "use server" — only invoked from server-side code (API routes, AI tools,
// other server actions). The "use server" directive forces all exports to be
// async, which conflicts with formatStaleSummary being a pure formatter.

import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"
import { and, eq, isNull, lte } from "drizzle-orm"

export type StaleTask = {
  id: string
  title: string
  status: "todo" | "in_progress"
  daysSinceUpdate: number
  reason: "in_progress_too_long" | "no_due_date_old" | "stuck_with_due_date"
  dueDate: string | null
}

export type StaleReport = {
  total: number
  inProgressTooLong: StaleTask[]
  noDueDateOld: StaleTask[]
  stuckWithDueDate: StaleTask[]
}

const IN_PROGRESS_THRESHOLD_DAYS = 7
const NO_DUE_DATE_THRESHOLD_DAYS = 14

export async function findStaleTasks(): Promise<StaleReport> {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const inProgressCutoff = new Date(now)
  inProgressCutoff.setDate(inProgressCutoff.getDate() - IN_PROGRESS_THRESHOLD_DAYS)
  const noDueDateCutoff = new Date(now)
  noDueDateCutoff.setDate(noDueDateCutoff.getDate() - NO_DUE_DATE_THRESHOLD_DAYS)

  const inProgressIso = inProgressCutoff.toISOString()
  const noDueDateIso = noDueDateCutoff.toISOString()

  // 1. In progress >7 days since last update
  const stuck = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "in_progress"),
        eq(tasks.isTemplate, false),
        isNull(tasks.archivedAt),
        lte(tasks.updatedAt, inProgressIso),
      ),
    )
    .all()

  // 2. Active tasks with no due date untouched >14 days
  const orphans = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "todo"),
        eq(tasks.isTemplate, false),
        isNull(tasks.archivedAt),
        isNull(tasks.dueDate),
        lte(tasks.updatedAt, noDueDateIso),
      ),
    )
    .all()

  // 3. Active tasks WITH due date that's already passed (separate from rollover —
  //    these are visibly overdue and should be re-evaluated)
  const overdueStuck = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.isTemplate, false),
        isNull(tasks.archivedAt),
      ),
    )
    .all()

  const overdueWithDate: StaleTask[] = []
  for (const t of overdueStuck) {
    if (t.status === "done") continue
    if (!t.dueDate) continue
    if (t.dueDate >= today) continue
    const updatedDate = new Date(t.updatedAt)
    const daysSince = Math.floor((now.getTime() - updatedDate.getTime()) / 86_400_000)
    if (daysSince < 3) continue // give recent activity a moment
    overdueWithDate.push({
      id: t.id,
      title: t.title,
      status: t.status as "todo" | "in_progress",
      daysSinceUpdate: daysSince,
      reason: "stuck_with_due_date",
      dueDate: t.dueDate,
    })
  }

  function toReport(
    rows: typeof stuck,
    reason: StaleTask["reason"],
  ): StaleTask[] {
    return rows.map((t) => {
      const updatedDate = new Date(t.updatedAt)
      const daysSince = Math.floor(
        (now.getTime() - updatedDate.getTime()) / 86_400_000,
      )
      return {
        id: t.id,
        title: t.title,
        status: t.status as "todo" | "in_progress",
        daysSinceUpdate: daysSince,
        reason,
        dueDate: t.dueDate,
      }
    })
  }

  const inProgressTooLong = toReport(stuck, "in_progress_too_long")
  const noDueDateOld = toReport(orphans, "no_due_date_old")

  return {
    total: inProgressTooLong.length + noDueDateOld.length + overdueWithDate.length,
    inProgressTooLong,
    noDueDateOld,
    stuckWithDueDate: overdueWithDate,
  }
}

export function formatStaleSummary(report: StaleReport): string[] {
  if (report.total === 0) return []
  const lines: string[] = []

  if (report.inProgressTooLong.length > 0) {
    lines.push(
      `${report.inProgressTooLong.length} task${report.inProgressTooLong.length === 1 ? "" : "s"} have been "in progress" over a week. Either commit or kill:`,
    )
    for (const t of report.inProgressTooLong.slice(0, 5)) {
      lines.push(`  - ${t.title} (${t.daysSinceUpdate}d untouched)`)
    }
  }

  if (report.stuckWithDueDate.length > 0) {
    if (lines.length > 0) lines.push("")
    lines.push(
      `${report.stuckWithDueDate.length} task${report.stuckWithDueDate.length === 1 ? "" : "s"} overdue and untouched in days:`,
    )
    for (const t of report.stuckWithDueDate.slice(0, 5)) {
      lines.push(`  - ${t.title} (was due ${t.dueDate})`)
    }
  }

  if (report.noDueDateOld.length > 0) {
    if (lines.length > 0) lines.push("")
    lines.push(
      `${report.noDueDateOld.length} task${report.noDueDateOld.length === 1 ? "" : "s"} with no due date and no recent activity. Schedule or archive:`,
    )
    for (const t of report.noDueDateOld.slice(0, 5)) {
      lines.push(`  - ${t.title}`)
    }
  }

  return lines
}
