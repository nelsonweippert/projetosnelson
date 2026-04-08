"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { createContentSchema } from "@/validations/content.validation"
import { createContent, updateContent, archiveContent } from "@/services/content.service"
import type { ActionResult } from "@/types"

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

export async function createContentAction(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = createContentSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: "Dados inválidos" }
    const content = await createContent(userId, parsed.data)
    revalidatePath("/conteudo")
    return { success: true, data: content }
  } catch { return { success: false, error: "Erro ao criar conteúdo" } }
}

export async function advanceContentPhaseAction(id: string, phase: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const content = await updateContent(id, userId, { phase: phase as any })
    revalidatePath("/conteudo")
    return { success: true, data: content }
  } catch { return { success: false, error: "Erro ao avançar fase" } }
}

export async function archiveContentAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await archiveContent(id, userId)
    revalidatePath("/conteudo")
    return { success: true, data: null }
  } catch { return { success: false, error: "Erro ao arquivar conteúdo" } }
}
