import { ReindexButton } from "@/app/components/search/reindex-button"

export const dynamic = "force-dynamic"

export default function SearchSettings() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Search settings
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground-secondary">
          Luma indexes your notes, tasks, events, journal entries, memories, and chat as you work. If you want to force a full rebuild, use the button below.
        </p>
      </section>

      <ReindexButton />
    </div>
  )
}
