export const dynamic = "force-dynamic"

import { getMemories } from "@/lib/actions/memories"
import { MEMORY_CATEGORIES } from "@/lib/memories-types"
import { MemoryList } from "@/app/components/memories/memory-list"
import { NewMemoryForm } from "@/app/components/memories/new-memory-form"

function composeMemoriesLine(count: number): string {
  if (count === 0) {
    return "Nothing remembered yet. Luma will capture things worth keeping, or you can add them directly."
  }
  if (count === 1) return "One memory so far. A quiet start."
  return `${count} memories kept.`
}

export default async function MemoriesPage() {
  const all = await getMemories()
  const line = composeMemoriesLine(all.length)

  // Group by category, preserving category order
  const grouped: Record<string, typeof all> = {}
  for (const cat of MEMORY_CATEGORIES) grouped[cat] = []
  for (const m of all) {
    if (grouped[m.category]) grouped[m.category].push(m)
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="text-3xl font-medium tracking-tight"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Memory
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground-secondary">
            {line}
          </p>
        </div>
        <div className="shrink-0 sm:pt-1">
          <NewMemoryForm />
        </div>
      </section>

      <MemoryList grouped={grouped} />
    </div>
  )
}
