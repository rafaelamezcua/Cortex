"use client"

import { VaultAttachButton } from "@/app/components/ui/vault-attach-button"
import { attachNoteToVault } from "@/lib/actions/vault"

export function NoteVaultButton({
  noteId,
  configured = true,
}: {
  noteId: string
  configured?: boolean
}) {
  return (
    <VaultAttachButton
      onAttach={() => attachNoteToVault(noteId)}
      disabled={!configured}
      disabledReason="Set LUMA_BRAIN_PATH in .env to enable vault sync."
    />
  )
}
