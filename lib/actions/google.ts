"use server"

import { disconnectGoogle as dbDisconnect } from "@/lib/integrations/google-auth"
import { revalidatePath } from "next/cache"

export async function disconnectGoogle(): Promise<void> {
  await dbDisconnect()
  revalidatePath("/settings/integrations")
}
