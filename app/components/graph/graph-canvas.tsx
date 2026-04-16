"use client"

import "reactflow/dist/style.css"

import { useCallback, useMemo, useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "reactflow"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  NodeDetails,
  type NodeDetailsData,
} from "@/app/components/graph/node-details"

// Stable references outside the component so React Flow doesn't warn about
// a new nodeTypes/edgeTypes object on every render.
const nodeTypes = {}
const edgeTypes = {}

export type GraphKind = "note" | "task" | "event" | "project" | "journal"

type GraphPayloadNode = {
  id: string
  kind: GraphKind
  label: string
  href: string
}

type GraphPayloadEdge = {
  id: string
  source: string
  target: string
  kind: "event-note" | "project-task" | "subtask" | "journal-date"
}

type GraphData = {
  nodes: GraphPayloadNode[]
  edges: GraphPayloadEdge[]
}

const KIND_ORDER: GraphKind[] = [
  "project",
  "task",
  "note",
  "event",
  "journal",
]

const KIND_LABEL: Record<GraphKind, string> = {
  project: "Projects",
  task: "Tasks",
  note: "Notes",
  event: "Events",
  journal: "Journal",
}

// Map each kind to a design token. Tokens only — no hex.
const KIND_TOKEN: Record<GraphKind, string> = {
  project: "var(--accent)",
  task: "var(--accent-hover)",
  note: "var(--success)",
  event: "var(--warning)",
  journal: "var(--danger)",
}

/**
 * Concentric-ring layout by kind — cheap, deterministic, zero dependencies.
 * Each kind gets its own ring radius; nodes are spread evenly around it.
 */
function layoutByKind(
  nodes: GraphPayloadNode[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const center = { x: 0, y: 0 }
  const ringStep = 260

  const byKind = new Map<GraphKind, GraphPayloadNode[]>()
  for (const n of nodes) {
    const arr = byKind.get(n.kind) ?? []
    arr.push(n)
    byKind.set(n.kind, arr)
  }

  KIND_ORDER.forEach((kind, ringIndex) => {
    const group = byKind.get(kind)
    if (!group || group.length === 0) return
    const radius = (ringIndex + 1) * ringStep
    const angleStep = (Math.PI * 2) / group.length
    // Offset each ring so adjacent rings don't perfectly align.
    const phase = ringIndex * 0.4
    group.forEach((node, i) => {
      const angle = i * angleStep + phase
      positions.set(node.id, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      })
    })
  })

  return positions
}

export function GraphCanvas({ data }: { data: GraphData }) {
  const [enabledKinds, setEnabledKinds] = useState<Record<GraphKind, boolean>>({
    note: true,
    task: true,
    event: true,
    project: true,
    journal: true,
  })
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<NodeDetailsData | null>(null)

  const positions = useMemo(() => layoutByKind(data.nodes), [data.nodes])

  const normalizedQuery = query.trim().toLowerCase()

  const rfNodes = useMemo<Node[]>(() => {
    return data.nodes.map((n) => {
      const pos = positions.get(n.id) ?? { x: 0, y: 0 }
      const kindEnabled = enabledKinds[n.kind]
      const matchesSearch =
        normalizedQuery.length === 0
          ? true
          : n.label.toLowerCase().includes(normalizedQuery)
      const dim = !kindEnabled || !matchesSearch

      return {
        id: n.id,
        position: pos,
        data: { label: n.label, kind: n.kind, href: n.href },
        style: {
          background: KIND_TOKEN[n.kind],
          color: "var(--foreground)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-md)",
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: 500,
          minWidth: 120,
          opacity: dim ? 0.2 : 1,
          transition: "opacity 200ms var(--ease-out)",
        },
      }
    })
  }, [data.nodes, positions, enabledKinds, normalizedQuery])

  const rfEdges = useMemo<Edge[]>(() => {
    const visible = new Set(
      data.nodes
        .filter((n) => enabledKinds[n.kind])
        .map((n) => n.id),
    )
    return data.edges.map((e) => {
      const shown = visible.has(e.source) && visible.has(e.target)
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        style: {
          stroke: "var(--border-strong)",
          strokeWidth: 1,
          opacity: shown ? 0.5 : 0.1,
          transition: "opacity 200ms var(--ease-out)",
        },
      }
    })
  }, [data.edges, data.nodes, enabledKinds])

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      const found = data.nodes.find((n) => n.id === node.id)
      if (!found) return
      setSelected({
        id: found.id,
        kind: found.kind,
        label: found.label,
        href: found.href,
      })
    },
    [data.nodes],
  )

  function toggleKind(kind: GraphKind) {
    setEnabledKinds((prev) => ({ ...prev, [kind]: !prev[kind] }))
  }

  return (
    <div className="relative flex h-[calc(100svh-9rem)] min-h-[420px] flex-col overflow-hidden rounded-[--radius-xl] border border-border-light bg-surface">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border-light/60 px-4 py-3">
        <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-[--radius-md] border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-[color:var(--accent-ring)]">
          <Search className="h-4 w-4 shrink-0 text-foreground-tertiary" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes"
            className="w-full bg-transparent text-[13px] text-foreground placeholder:text-foreground-tertiary focus:outline-none"
            aria-label="Search nodes"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {KIND_ORDER.map((kind) => {
            const on = enabledKinds[kind]
            return (
              <label
                key={kind}
                className={cn(
                  "group inline-flex cursor-pointer select-none items-center gap-2 rounded-[--radius-full] border px-3 py-1.5 text-[12px] transition-colors duration-150",
                  "hover:bg-surface-hover",
                  "focus-within:ring-2 focus-within:ring-[color:var(--accent-ring)]",
                  on
                    ? "border-border-strong bg-surface-raised text-foreground"
                    : "border-border-light bg-transparent text-foreground-tertiary",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleKind(kind)}
                  className="sr-only"
                  aria-label={`Toggle ${KIND_LABEL[kind]}`}
                />
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: KIND_TOKEN[kind],
                    opacity: on ? 1 : 0.3,
                    transition: "opacity 150ms var(--ease-out)",
                  }}
                />
                {KIND_LABEL[kind]}
              </label>
            )
          })}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={handleNodeClick}
          fitView
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
        >
          <Background color="var(--border-light)" gap={24} />
          <Controls
            showInteractive={false}
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-md)",
            }}
          />
          <MiniMap
            pannable
            zoomable
            maskColor="var(--scrim)"
            nodeColor={(n) => {
              const kind = (n.data as { kind?: GraphKind })?.kind
              return kind ? KIND_TOKEN[kind] : "var(--border-strong)"
            }}
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-md)",
            }}
          />
        </ReactFlow>

        {data.nodes.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-[13px] text-foreground-tertiary">
              Nothing to show yet. Add a note, task, or event to see it here.
            </p>
          </div>
        ) : null}
      </div>

      <NodeDetails node={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
