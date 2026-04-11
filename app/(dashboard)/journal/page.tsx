export const dynamic = "force-dynamic"

import { getJournalEntry } from "@/lib/actions/journal"
import { JournalEditor } from "@/app/components/journal/journal-editor"

function composeJournalLine(hasEntry: boolean, hasContent: boolean): string {
  if (!hasEntry || !hasContent) {
    return "A blank page today. Tell it what happened."
  }
  return "Today's page is already started. Keep going when you have more."
}

export default async function JournalPage() {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const entry = await getJournalEntry(todayStr)
  const journalLine = composeJournalLine(
    !!entry,
    !!(entry && entry.content && entry.content.trim().length > 0)
  )

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Journal
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-foreground-secondary">
          {journalLine}
        </p>
      </section>

      <JournalEditor
        initialEntry={entry || undefined}
        initialDate={todayStr}
      />
    </div>
  )
}
