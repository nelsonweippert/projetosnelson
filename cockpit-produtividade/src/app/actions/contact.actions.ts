"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import {
  createContactSchema,
  updateContactSchema,
} from "@/validations/contact.validation"
import {
  createContact,
  updateContact,
  archiveContact,
} from "@/services/contact.service"
import type { ActionResult } from "@/types"

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

export async function createContactAction(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = createContactSchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error:
          "Dados inválidos: " +
          JSON.stringify(parsed.error.flatten().fieldErrors),
      }
    }
    const contact = await createContact(userId, parsed.data)
    revalidatePath("/contatos")
    return { success: true, data: contact }
  } catch (err) {
    return {
      success: false,
      error: "Erro: " + (err instanceof Error ? err.message : String(err)),
    }
  }
}

export async function updateContactAction(
  id: string,
  data: unknown,
): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = updateContactSchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error:
          "Dados inválidos: " +
          JSON.stringify(parsed.error.flatten().fieldErrors),
      }
    }
    const contact = await updateContact(id, userId, parsed.data)
    revalidatePath("/contatos")
    return { success: true, data: contact }
  } catch (err) {
    return {
      success: false,
      error: "Erro: " + (err instanceof Error ? err.message : String(err)),
    }
  }
}

export async function archiveContactAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await archiveContact(id, userId)
    revalidatePath("/contatos")
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao arquivar contato" }
  }
}
