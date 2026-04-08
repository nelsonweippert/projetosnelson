"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { createStudySchema, updateStudySchema, addSessionSchema } from "@/validations/study.validation"
import { createStudy, updateStudy, deleteStudy, addStudySession } from "@/services/study.service"
import type { ActionResult } from "@/types"

async function getUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

export async function createStudyAction(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = createStudySchema.safeParse(data)
    if (!parsed.success) return { success: false, error: "Dados inválidos" }

    const study = await createStudy(userId, parsed.data)
    revalidatePath("/estudos")
    return { success: true, data: study }
  } catch {
    return { success: false, error: "Erro ao criar estudo" }
  }
}

export async function updateStudyAction(id: string, data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = updateStudySchema.safeParse(data)
    if (!parsed.success) return { success: false, error: "Dados inválidos" }

    const study = await updateStudy(id, userId, parsed.data)
    revalidatePath("/estudos")
    return { success: true, data: study }
  } catch {
    return { success: false, error: "Erro ao atualizar estudo" }
  }
}

export async function deleteStudyAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await deleteStudy(id, userId)
    revalidatePath("/estudos")
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao deletar estudo" }
  }
}

export async function addStudySessionAction(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = addSessionSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: "Dados inválidos" }

    const session = await addStudySession(userId, parsed.data)
    revalidatePath("/estudos")
    return { success: true, data: session }
  } catch {
    return { success: false, error: "Erro ao registrar sessão" }
  }
}
