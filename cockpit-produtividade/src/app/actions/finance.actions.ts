"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { createTransactionSchema } from "@/validations/finance.validation"
import { createTransaction, archiveTransaction } from "@/services/finance.service"
import type { ActionResult } from "@/types"

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

export async function createTransactionAction(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = createTransactionSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: "Dados inválidos" }
    const transaction = await createTransaction(userId, parsed.data)
    revalidatePath("/financeiro")
    return { success: true, data: transaction }
  } catch { return { success: false, error: "Erro ao criar lançamento" } }
}

export async function archiveTransactionAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await archiveTransaction(id, userId)
    revalidatePath("/financeiro")
    return { success: true, data: null }
  } catch { return { success: false, error: "Erro ao arquivar lançamento" } }
}
