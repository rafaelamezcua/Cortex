"use client"

import { VaultAttachButton } from "@/app/components/ui/vault-attach-button"
import { attachNoteToVault } from "@/lib/actions/vault"

export function NoteVaultButton({ noteId }: { noteId: string }) {
  return <VaultAttachButton onAttach={() => attachNoteToVault(noteId)} />
}
