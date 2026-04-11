"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { createReferenceSchema } from "@/validations/reference.validation"
import { createReference, updateReference, archiveReference } from "@/services/reference.service"
import type { ActionResult } from "@/types"

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

export async function createReferenceAction(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = createReferenceSchema.safeParse(data)
    if (!parsed.success) {
      console.error("[createReferenceAction] validation failed:", parsed.error.flatten())
      return { success: false, error: "Dados inválidos: " + JSON.stringify(parsed.error.flatten().fieldErrors) }
    }
    const ref = await createReference(userId, parsed.data)
    revalidatePath("/estudos")
    return { success: true, data: ref }
  } catch (err) {
    console.error("[createReferenceAction] error:", err)
    return { success: false, error: "Erro: " + (err instanceof Error ? err.message : String(err)) }
  }
}

export async function updateReferenceStatusAction(id: string, status: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const readAt = status === "READ" ? new Date() : null
    const ref = await updateReference(id, userId, { status: status as any, readAt })
    revalidatePath("/estudos")
    return { success: true, data: ref }
  } catch { return { success: false, error: "Erro ao atualizar status" } }
}

export async function updateReferenceAction(id: string, data: Record<string, unknown>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const ref = await updateReference(id, userId, data as any)
    revalidatePath("/estudos")
    return { success: true, data: ref }
  } catch { return { success: false, error: "Erro ao atualizar referência" } }
}

export async function archiveReferenceAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await archiveReference(id, userId)
    revalidatePath("/estudos")
    return { success: true, data: null }
  } catch { return { success: false, error: "Erro ao arquivar referência" } }
}
