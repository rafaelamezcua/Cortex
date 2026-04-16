import { getGraphData } from "@/lib/actions/graph"
import { GraphCanvas } from "@/app/components/graph/graph-canvas"

export default async function GraphPage() {
  const data = await getGraphData()

  const totalNodes = data.nodes.length
  const totalEdges = data.edges.length
  const summary =
    totalNodes === 0
      ? "Nothing to map yet."
      : `${totalNodes} node${totalNodes === 1 ? "" : "s"}, ${totalEdges} connection${totalEdges === 1 ? "" : "s"}.`

  // Strip updatedAt before passing to the client (it is only used server-side for the cap).
  const clientData = {
    nodes: data.nodes.map(({ id, kind, label, href }) => ({
      id,
      kind,
      label,
      href,
    })),
    edges: data.edges,
  }

  return (
    <div className="space-y-6">
      <header>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Graph
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-foreground-secondary">
          {summary}
        </p>
      </header>

      <GraphCanvas data={clientData} />
    </div>
  )
}
