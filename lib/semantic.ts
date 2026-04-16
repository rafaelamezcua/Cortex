import "server-only"

import { db } from "@/lib/db"
import { embeddings } from "@/lib/schema"
import { and, eq } from "drizzle-orm"
import { nanoid } from "nanoid"

/**
 * Semantic search layer.
 *
 * Design notes
 * - No native vector extension (sqlite-vec loading is unreliable on Windows);
 *   we compute cosine similarity in JS at query time. Fine at small/medium
 *   scale (thousands of rows).
 * - Embeddings are stored as JSON-encoded Float32 arrays in a BLOB column.
 *   Simple, portable, and parse is cheap relative to the HTTP call cost.
 * - Provider auto-selection: Voyage first (cheaper, better for search), then
 *   OpenAI. If neither key is set every call silently no-ops so the product
 *   works without semantic search.
 */

export type EmbedKind =
  | "note"
  | "task"
  | "event"
  | "journal"
  | "memory"
  | "chat"

export interface SemanticHit {
  kind: EmbedKind
  refId: string
  score: number
  snippet: string
}

interface Provider {
  name: "voyage" | "openai"
  model: string
  dims: number
}

function getProvider(): Provider | null {
  if (process.env.VOYAGE_API_KEY) {
    return { name: "voyage", model: "voyage-3", dims: 1024 }
  }
  if (process.env.OPENAI_API_KEY) {
    return { name: "openai", model: "text-embedding-3-small", dims: 1536 }
  }
  return null
}

export function hasSemanticProvider(): boolean {
  return getProvider() !== null
}

// ---------- Embedding helpers ----------

async function callProvider(
  text: string,
  mode: "document" | "query",
): Promise<Float32Array | null> {
  const provider = getProvider()
  if (!provider) return null

  const trimmed = text.trim()
  if (!trimmed) return null

  // Cap input length defensively. 8k chars ~= 2k tokens which is well under
  // both providers' limits and keeps latency/cost predictable.
  const input = trimmed.slice(0, 8000)

  try {
    if (provider.name === "voyage") {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
          input,
          model: provider.model,
          input_type: mode,
        }),
      })
      if (!res.ok) return null
      const json = (await res.json()) as {
        data?: { embedding?: number[] }[]
      }
      const vec = json.data?.[0]?.embedding
      if (!vec) return null
      return Float32Array.from(vec)
    }

    // OpenAI
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        input,
        model: provider.model,
      }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      data?: { embedding?: number[] }[]
    }
    const vec = json.data?.[0]?.embedding
    if (!vec) return null
    return Float32Array.from(vec)
  } catch {
    // Network or parsing error: degrade silently so callers can't crash.
    return null
  }
}

export async function embedDocument(text: string): Promise<Float32Array | null> {
  return callProvider(text, "document")
}

export async function embedQuery(text: string): Promise<Float32Array | null> {
  return callProvider(text, "query")
}

// ---------- Math ----------

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let an = 0
  let bn = 0
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    dot += x * y
    an += x * x
    bn += y * y
  }
  const denom = Math.sqrt(an) * Math.sqrt(bn)
  return denom === 0 ? 0 : dot / denom
}

// ---------- Storage ----------

function encodeVector(vec: Float32Array): Buffer {
  // JSON round-trip keeps the storage portable if we ever migrate.
  return Buffer.from(JSON.stringify(Array.from(vec)), "utf8")
}

function decodeVector(blob: Buffer | Uint8Array): Float32Array | null {
  try {
    const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob)
    const arr = JSON.parse(buf.toString("utf8")) as unknown
    if (!Array.isArray(arr)) return null
    return Float32Array.from(arr as number[])
  } catch {
    return null
  }
}

export async function storeEmbedding(
  kind: EmbedKind,
  refId: string,
  text: string,
): Promise<void> {
  const provider = getProvider()
  if (!provider) return
  if (!text || !text.trim()) {
    // Nothing to embed: clean out any stale vector so search stays accurate.
    await deleteEmbedding(kind, refId)
    return
  }

  const vec = await embedDocument(text)
  if (!vec) return

  const now = new Date().toISOString()

  // Upsert = delete + insert. Cheap and avoids SQLite's fussy ON CONFLICT
  // semantics across drivers.
  await db
    .delete(embeddings)
    .where(and(eq(embeddings.kind, kind), eq(embeddings.refId, refId)))

  await db.insert(embeddings).values({
    id: nanoid(),
    kind,
    refId,
    embedding: encodeVector(vec),
    model: `${provider.name}:${provider.model}`,
    updatedAt: now,
  })
}

export async function deleteEmbedding(
  kind: EmbedKind,
  refId: string,
): Promise<void> {
  await db
    .delete(embeddings)
    .where(and(eq(embeddings.kind, kind), eq(embeddings.refId, refId)))
}

// ---------- Search ----------

export interface SearchOptions {
  kinds?: EmbedKind[]
  limit?: number
}

function buildSnippet(text: string | null | undefined, max = 180): string {
  if (!text) return ""
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean
}

export async function searchSemantic(
  query: string,
  opts: SearchOptions = {},
): Promise<SemanticHit[]> {
  const provider = getProvider()
  if (!provider) return []
  if (!query.trim()) return []

  const qvec = await embedQuery(query)
  if (!qvec) return []

  const { kinds, limit = 20 } = opts

  const rows = await db.select().from(embeddings).all()

  const scored: SemanticHit[] = []
  for (const row of rows) {
    if (kinds && !kinds.includes(row.kind as EmbedKind)) continue
    const vec = decodeVector(row.embedding as Buffer)
    if (!vec) continue
    if (vec.length !== qvec.length) continue
    const score = cosineSimilarity(qvec, vec)
    scored.push({
      kind: row.kind as EmbedKind,
      refId: row.refId,
      score,
      snippet: "",
    })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}

// Shared snippet helper for callers that hydrate rows.
export { buildSnippet }
