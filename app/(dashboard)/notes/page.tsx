import { getNotes } from "@/lib/actions/notes"
import { NoteCard } from "@/app/components/notes/note-card"
import { NewNoteForm } from "@/app/components/notes/new-note-form"

export default async function NotesPage() {
  const allNotes = await getNotes()

  const pinned = allNotes.filter((n) => n.pinned)
  const unpinned = allNotes.filter((n) => !n.pinned)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="mt-1 text-sm text-foreground-secondary">
            Capture your thoughts.
          </p>
        </div>
        <NewNoteForm />
      </div>

      {allNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-foreground-tertiary">
            No notes yet. Create your first one.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-foreground-quaternary">
                Pinned
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pinned.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          )}

          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-foreground-quaternary">
                  All Notes
                </h2>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
