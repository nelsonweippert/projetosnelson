"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { createNoteSchema, updateNoteSchema } from "@/validations/note.validation"
import {
  createNote,
  updateNote,
  archiveNote,
  togglePinNote,
} from "@/services/note.service"
import type { ActionResult } from "@/types"

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

export async function createNoteAction(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = createNoteSchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error: "Dados inválidos: " + JSON.stringify(parsed.error.flatten().fieldErrors),
      }
    }
    const note = await createNote(userId, parsed.data)
    revalidatePath("/notas")
    revalidatePath("/areas")
    return { success: true, data: note }
  } catch (err) {
    return {
      success: false,
      error: "Erro: " + (err instanceof Error ? err.message : String(err)),
    }
  }
}

export async function updateNoteAction(
  id: string,
  data: unknown,
): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = updateNoteSchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error: "Dados inválidos: " + JSON.stringify(parsed.error.flatten().fieldErrors),
      }
    }
    const note = await updateNote(id, userId, parsed.data)
    revalidatePath("/notas")
    return { success: true, data: note }
  } catch (err) {
    return {
      success: false,
      error: "Erro: " + (err instanceof Error ? err.message : String(err)),
    }
  }
}

export async function archiveNoteAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await archiveNote(id, userId)
    revalidatePath("/notas")
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao arquivar nota" }
  }
}

export async function togglePinNoteAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const note = await togglePinNote(id, userId)
    revalidatePath("/notas")
    return { success: true, data: note }
  } catch {
    return { success: false, error: "Erro ao fixar nota" }
  }
}
