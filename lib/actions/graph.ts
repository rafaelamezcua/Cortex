"use server"

import { db } from "@/lib/db"
import {
  notes,
  tasks,
  calendarEvents,
  projects,
  projectTasks,
  journalEntries,
} from "@/lib/schema"

export type GraphNodeKind =
  | "note"
  | "task"
  | "event"
  | "project"
  | "journal"

export type GraphNode = {
  id: string
  kind: GraphNodeKind
  label: string
  href: string
  /** ISO timestamp used for sorting / capping, not serialized for the client to rely on. */
  updatedAt: string
}

export type GraphEdgeKind =
  | "event-note"
  | "project-task"
  | "subtask"
  | "journal-date"

export type GraphEdge = {
  id: string
  source: string
  target: string
  kind: GraphEdgeKind
}

export type GraphData = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const MAX_NODES = 500

function nodeId(kind: GraphNodeKind, dbId: string): string {
  return `${kind}:${dbId}`
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function truncate(label: string, max = 60): string {
  const clean = label.trim() || "Untitled"
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean
}

export async function getGraphData(): Promise<GraphData> {
  const thirtyDaysAgo = daysAgoIso(30)
  const thirtyDaysAgoDate = thirtyDaysAgo.slice(0, 10) // YYYY-MM-DD
  const thirtyDaysAhead = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString()
  })()

  const [
    allNotes,
    allTasks,
    allProjects,
    allProjectTasks,
    allEvents,
    allJournal,
  ] = await Promise.all([
    db.select().from(notes).all(),
    db.select().from(tasks).all(),
    db.select().from(projects).all(),
    db.select().from(projectTasks).all(),
    db.select().from(calendarEvents).all(),
    db.select().from(journalEntries).all(),
  ])

  // --- Build candidate node list with updatedAt for cap sorting ---
  const candidates: GraphNode[] = []

  for (const n of allNotes) {
    candidates.push({
      id: nodeId("note", n.id),
      kind: "note",
      label: truncate(n.title),
      href: `/notes/${n.id}`,
      updatedAt: n.updatedAt,
    })
  }

  for (const t of allTasks) {
    const keep =
      t.status !== "done" ||
      (t.updatedAt && t.updatedAt >= thirtyDaysAgo)
    if (!keep) continue
    candidates.push({
      id: nodeId("task", t.id),
      kind: "task",
      label: truncate(t.title),
      href: `/tasks`,
      updatedAt: t.updatedAt,
    })
  }

  for (const pt of allProjectTasks) {
    const keep =
      pt.status !== "done" ||
      (pt.updatedAt && pt.updatedAt >= thirtyDaysAgo)
    if (!keep) continue
    candidates.push({
      id: nodeId("task", pt.id),
      kind: "task",
      label: truncate(pt.title),
      href: `/projects/${pt.projectId}`,
      updatedAt: pt.updatedAt,
    })
  }

  for (const p of allProjects) {
    candidates.push({
      id: nodeId("project", p.id),
      kind: "project",
      label: truncate(p.name),
      href: `/projects/${p.id}`,
      updatedAt: p.updatedAt,
    })
  }

  for (const e of allEvents) {
    // Upcoming OR within last 30 days.
    const keep =
      e.startTime >= thirtyDaysAgo && e.startTime <= thirtyDaysAhead
    if (!keep) continue
    candidates.push({
      id: nodeId("event", e.id),
      kind: "event",
      label: truncate(e.title),
      href: `/calendar`,
      updatedAt: e.updatedAt,
    })
  }

  for (const j of allJournal) {
    if (j.date < thirtyDaysAgoDate) continue
    candidates.push({
      id: nodeId("journal", j.id),
      kind: "journal",
      label: truncate(`Journal ${j.date}`),
      href: `/journal`,
      updatedAt: j.updatedAt,
    })
  }

  // --- Cap node count: keep newest-updated first ---
  candidates.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  const capped = candidates.slice(0, MAX_NODES)
  const keepIds = new Set(capped.map((n) => n.id))

  // --- Build edges, filtering to nodes that survived the cap ---
  const edges: GraphEdge[] = []

  // notes.eventId -> event
  for (const n of allNotes) {
    if (!n.eventId) continue
    const src = nodeId("note", n.id)
    const tgt = nodeId("event", n.eventId)
    if (!keepIds.has(src) || !keepIds.has(tgt)) continue
    edges.push({
      id: `e:${src}->${tgt}`,
      source: src,
      target: tgt,
      kind: "event-note",
    })
  }

  // project_tasks.projectId -> project
  for (const pt of allProjectTasks) {
    const src = nodeId("task", pt.id)
    const tgt = nodeId("project", pt.projectId)
    if (!keepIds.has(src) || !keepIds.has(tgt)) continue
    edges.push({
      id: `e:${src}->${tgt}`,
      source: src,
      target: tgt,
      kind: "project-task",
    })
  }

  // tasks.parentId -> parent (subtask)
  for (const t of allTasks) {
    if (!t.parentId) continue
    const src = nodeId("task", t.id)
    const tgt = nodeId("task", t.parentId)
    if (!keepIds.has(src) || !keepIds.has(tgt)) continue
    edges.push({
      id: `e:${src}->${tgt}`,
      source: src,
      target: tgt,
      kind: "subtask",
    })
  }

  // project_tasks.parentId -> parent
  for (const pt of allProjectTasks) {
    if (!pt.parentId) continue
    const src = nodeId("task", pt.id)
    const tgt = nodeId("task", pt.parentId)
    if (!keepIds.has(src) || !keepIds.has(tgt)) continue
    edges.push({
      id: `e:${src}->${tgt}`,
      source: src,
      target: tgt,
      kind: "subtask",
    })
  }

  // journal_entries.date -> same-day events
  // Build a map of date -> event ids for O(n+m) join.
  const eventsByDate = new Map<string, string[]>()
  for (const e of allEvents) {
    const date = e.startTime.slice(0, 10)
    const arr = eventsByDate.get(date) ?? []
    arr.push(e.id)
    eventsByDate.set(date, arr)
  }
  for (const j of allJournal) {
    const src = nodeId("journal", j.id)
    if (!keepIds.has(src)) continue
    const sameDayEvents = eventsByDate.get(j.date) ?? []
    for (const eid of sameDayEvents) {
      const tgt = nodeId("event", eid)
      if (!keepIds.has(tgt)) continue
      edges.push({
        id: `e:${src}->${tgt}`,
        source: src,
        target: tgt,
        kind: "journal-date",
      })
    }
  }

  // Drop updatedAt from returned nodes (client doesn't need it).
  const nodesOut: GraphNode[] = capped.map((n) => ({
    id: n.id,
    kind: n.kind,
    label: n.label,
    href: n.href,
    updatedAt: n.updatedAt,
  }))

  return { nodes: nodesOut, edges }
}
