"use client"

import {
  Search,
  FileText,
  CheckSquare,
  Calendar,
  BookOpen,
  Brain,
  MessageCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import type { HydratedHit, SearchResponse } from "@/lib/actions/semantic"
import { runSemanticSearch } from "@/lib/actions/semantic"
import { cn } from "@/lib/utils"

type Kind = HydratedHit["kind"]

const KIND_META: Record<
  Kind,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  note: { label: "Notes", icon: FileText },
  task: { label: "Tasks", icon: CheckSquare },
  event: { label: "Events", icon: Calendar },
  journal: { label: "Journal", icon: BookOpen },
  memory: { label: "Memories", icon: Brain },
  chat: { label: "Chat", icon: MessageCircle },
}

const KIND_ORDER: Kind[] = ["note", "task", "event", "journal", "memory", "chat"]

interface Props {
  initialQuery: string
  initialResponse: SearchResponse
}

/**
 * Semantic search page.
 *
 * - Input keeps `?q=` in sync via `router.replace` so the URL is shareable.
 * - Debounced at 250ms; in-flight requests don't block UI.
 * - Empty states differ based on whether the user has typed anything yet.
 * - Results group by kind, sorted by provider similarity score.
 */
export function SearchPage({ initialQuery, initialResponse }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [response, setResponse] = useState<SearchResponse>(initialResponse)
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestQueryRef = useRef(initialQuery)

  // Keep the URL in sync with what the user types (debounced).
  const syncUrl = useCallback(
    (next: string) => {
      const sp = new URLSearchParams(params?.toString() ?? "")
      if (next) sp.set("q", next)
      else sp.delete("q")
      const qs = sp.toString()
      startTransition(() => {
        router.replace(qs ? `/search?${qs}` : "/search", { scroll: false })
      })
    },
    [params, router],
  )

  const runSearch = useCallback(async (q: string) => {
    latestQueryRef.current = q
    if (!q.trim()) {
      setResponse({ hits: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await runSemanticSearch(q, { limit: 30 })
      // Race guard — only apply result if it's still the latest query.
      if (latestQueryRef.current === q) {
        setResponse(res)
      }
    } catch {
      if (latestQueryRef.current === q) setResponse({ hits: [] })
    } finally {
      if (latestQueryRef.current === q) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      syncUrl(query)
      void runSearch(query)
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // runSearch + syncUrl are stable references; we only trigger on query change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<Kind, HydratedHit[]>()
    for (const hit of response.hits) {
      const arr = map.get(hit.kind) ?? []
      arr.push(hit)
      map.set(hit.kind, arr)
    }
    return map
  }, [response.hits])

  const busy = loading || isPending

  return (
    <div className="space-y-8">
      <section>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Search
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground-secondary">
          One field across everything Luma knows about you. Meaning, not just
          keywords.
        </p>
      </section>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-quaternary"
        />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you looking for?"
          aria-label="Search everything"
          className={cn(
            "h-12 w-full rounded-[--radius-lg] border border-border bg-surface pl-11 pr-4 text-[15px] text-foreground",
            "placeholder:text-foreground-quaternary",
            "outline-none transition-colors duration-150",
            "focus:border-accent focus:ring-2 focus:ring-accent/20",
          )}
        />
        {busy && (
          <span
            aria-hidden="true"
            className="absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 animate-pulse rounded-full bg-accent"
          />
        )}
      </div>

      {response.notice && (
        <div
          role="status"
          className="rounded-[--radius-md] border border-border-light bg-surface px-4 py-3 text-sm text-foreground-secondary"
        >
          {response.notice}
        </div>
      )}

      {!response.notice && !query.trim() && (
        <EmptyState
          title="Type to search everything Luma knows about you"
          subtitle="Notes, tasks, events, journal, memories, and your own chat messages."
        />
      )}

      {!response.notice && query.trim() && response.hits.length === 0 && !busy && (
        <EmptyState
          title="Nothing yet"
          subtitle="Try different wording, or reindex from Settings → Search."
        />
      )}

      {busy && response.hits.length === 0 && query.trim() && (
        <ResultsSkeleton />
      )}

      <div className="space-y-6">
        {KIND_ORDER.map((kind) => {
          const hits = grouped.get(kind)
          if (!hits || hits.length === 0) return null
          const meta = KIND_META[kind]
          const Icon = meta.icon
          return (
            <section key={kind} aria-label={meta.label}>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{meta.label}</span>
                <span className="text-foreground-quaternary">
                  ({hits.length})
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {hits.map((hit) => (
                  <li key={`${hit.kind}-${hit.refId}`}>
                    <Link
                      href={hit.url}
                      className={cn(
                        "group block rounded-[--radius-md] border border-border-light bg-surface px-4 py-3",
                        "transition-all duration-150",
                        "hover:border-accent/30 hover:bg-surface-hover",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {hit.title}
                          </p>
                          {hit.snippet && (
                            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-foreground-secondary">
                              {hit.snippet}
                            </p>
                          )}
                        </div>
                        <ScorePill score={hit.score} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function EmptyState({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div className="rounded-[--radius-lg] border border-border-light bg-surface px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-[13px] text-foreground-tertiary">{subtitle}</p>
    </div>
  )
}

function ScorePill({ score }: { score: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100)
  return (
    <span
      aria-label={`Match ${pct}%`}
      className="shrink-0 rounded-full border border-border-light bg-background-secondary px-2 py-0.5 text-[11px] font-medium text-foreground-tertiary"
    >
      {pct}
    </span>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-[68px] animate-pulse rounded-[--radius-md] border border-border-light bg-surface"
        />
      ))}
    </div>
  )
}
