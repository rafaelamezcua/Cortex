import { getNotes } from "@/lib/actions/notes"
import { NoteCard } from "@/app/components/notes/note-card"
import { NewNoteForm } from "@/app/components/notes/new-note-form"

function composeNotesLine(count: number, pinnedCount: number): string {
  if (count === 0) return "Nothing yet. Capture your first thought."
  if (count === 1) return pinnedCount === 1 ? "One pinned note." : "One note so far."
  if (pinnedCount === 0) return `${count} notes, nothing pinned yet.`
  if (pinnedCount === count) return `${count} notes, all pinned.`
  return `${count} notes, ${pinnedCount} pinned.`
}

export default async function NotesPage() {
  const allNotes = await getNotes()
  const pinned = allNotes.filter((n) => n.pinned)
  const unpinned = allNotes.filter((n) => !n.pinned)
  const notesLine = composeNotesLine(allNotes.length, pinned.length)

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="text-3xl font-medium tracking-tight"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Notes
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground-secondary">
            {notesLine}
          </p>
        </div>
        <div className="shrink-0 sm:pt-1">
          <NewNoteForm />
        </div>
      </section>

      {allNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[--radius-xl] border border-dashed border-border py-16">
          <p className="text-sm text-foreground-tertiary">
            Click New Note to start capturing.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {pinned.length > 0 && (
            <div>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                Pinned
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pinned.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          )}

          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                  All notes
                </h2>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {unpinned.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
