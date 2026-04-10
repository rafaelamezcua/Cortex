export const dynamic = "force-dynamic"

import { getJournalEntry } from "@/lib/actions/journal"
import { JournalEditor } from "@/app/components/journal/journal-editor"

export default async function JournalPage() {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const entry = await getJournalEntry(todayStr)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Reflect on your day.
        </p>
      </div>

      <JournalEditor
        initialEntry={entry || undefined}
        initialDate={todayStr}
      />
    </div>
  )
}
