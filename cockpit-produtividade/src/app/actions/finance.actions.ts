"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { createExpenseSchema, createIncomeSchema } from "@/validations/finance.validation"
import { createExpense, createIncome, deleteExpense, deleteIncome } from "@/services/finance.service"
import type { ActionResult } from "@/types"

async function getUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

export async function createExpenseAction(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = createExpenseSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: "Dados inválidos" }

    const expense = await createExpense(userId, parsed.data)
    revalidatePath("/financeiro")
    return { success: true, data: expense }
  } catch {
    return { success: false, error: "Erro ao criar despesa" }
  }
}

export async function createIncomeAction(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = createIncomeSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: "Dados inválidos" }

    const income = await createIncome(userId, parsed.data)
    revalidatePath("/financeiro")
    return { success: true, data: income }
  } catch {
    return { success: false, error: "Erro ao criar receita" }
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await deleteExpense(id, userId)
    revalidatePath("/financeiro")
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao deletar despesa" }
  }
}

export async function deleteIncomeAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await deleteIncome(id, userId)
    revalidatePath("/financeiro")
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao deletar receita" }
  }
}
