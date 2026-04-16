import { getNote } from "@/lib/actions/notes"
import { NoteEditor } from "@/app/components/notes/note-editor"
import { deleteNote } from "@/lib/actions/notes"
import { NoteVaultButton } from "@/app/components/notes/note-vault-button"
import { Button } from "@/app/components/ui/button"
import { ArrowLeft, Trash2 } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { isVaultConfigured } from "@/lib/integrations/luma-brain"

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const note = await getNote(id)

  if (!note) notFound()

  const vaultConfigured = isVaultConfigured()

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/notes"
          className="flex items-center gap-1.5 text-sm text-foreground-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Notes
        </Link>
        <div className="flex items-center gap-2">
          <NoteVaultButton noteId={id} configured={vaultConfigured} />
          <form
            action={async () => {
              "use server"
              await deleteNote(id)
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              <Trash2 className="h-3.5 w-3.5 text-danger" />
            </Button>
          </form>
        </div>
      </div>

      <NoteEditor note={note} />
    </div>
  )
}
