"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import {
  createStudySchema,
  updateStudySchema,
  addSessionSchema,
} from "@/validations/study.validation"
import {
  createStudy,
  updateStudy,
  archiveStudy,
  addStudySession,
  deleteStudySession,
} from "@/services/study.service"
import type { ActionResult } from "@/types"

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

export async function createStudyAction(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = createStudySchema.safeParse(data)
    if (!parsed.success) {
      console.error("[createStudyAction] validation failed:", parsed.error.flatten())
      return {
        success: false,
        error: "Dados inválidos: " + JSON.stringify(parsed.error.flatten().fieldErrors),
      }
    }
    const study = await createStudy(userId, parsed.data)
    revalidatePath("/estudos/projetos")
    revalidatePath("/estudos")
    return { success: true, data: study }
  } catch (err) {
    console.error("[createStudyAction] error:", err)
    return {
      success: false,
      error: "Erro: " + (err instanceof Error ? err.message : String(err)),
    }
  }
}

export async function updateStudyAction(
  id: string,
  data: unknown,
): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = updateStudySchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error: "Dados inválidos: " + JSON.stringify(parsed.error.flatten().fieldErrors),
      }
    }
    const study = await updateStudy(id, userId, parsed.data)
    revalidatePath("/estudos/projetos")
    return { success: true, data: study }
  } catch (err) {
    return {
      success: false,
      error: "Erro: " + (err instanceof Error ? err.message : String(err)),
    }
  }
}

export async function updateStudyStatusAction(
  id: string,
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PAUSED",
): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const study = await updateStudy(id, userId, { status })
    revalidatePath("/estudos/projetos")
    return { success: true, data: study }
  } catch {
    return { success: false, error: "Erro ao atualizar status" }
  }
}

export async function archiveStudyAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await archiveStudy(id, userId)
    revalidatePath("/estudos/projetos")
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao arquivar estudo" }
  }
}

export async function addStudySessionAction(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = addSessionSchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error: "Dados inválidos: " + JSON.stringify(parsed.error.flatten().fieldErrors),
      }
    }
    const session = await addStudySession(userId, parsed.data)
    revalidatePath("/estudos/projetos")
    return { success: true, data: session }
  } catch (err) {
    return {
      success: false,
      error: "Erro: " + (err instanceof Error ? err.message : String(err)),
    }
  }
}

export async function deleteStudySessionAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await deleteStudySession(id, userId)
    revalidatePath("/estudos/projetos")
    return { success: true, data: null }
  } catch (err) {
    return {
      success: false,
      error: "Erro: " + (err instanceof Error ? err.message : String(err)),
    }
  }
}
