import { SearchPage } from "@/app/components/search/search-page"
import { runSemanticSearch } from "@/lib/actions/semantic"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function Search({ searchParams }: PageProps) {
  const params = await searchParams
  const q = params.q?.trim() ?? ""
  const initialResponse = q.length > 0
    ? await runSemanticSearch(q)
    : { hits: [] }

  return <SearchPage initialQuery={q} initialResponse={initialResponse} />
}
