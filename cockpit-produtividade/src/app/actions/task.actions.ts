"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { createTaskSchema, updateTaskSchema } from "@/validations/task.validation"
import { createTask, updateTask, deleteTask } from "@/services/task.service"
import type { ActionResult } from "@/types"

async function getUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

export async function createTaskAction(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = createTaskSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: "Dados inválidos" }

    const task = await createTask(userId, parsed.data)
    revalidatePath("/tarefas")
    return { success: true, data: task }
  } catch (e) {
    return { success: false, error: "Erro ao criar tarefa" }
  }
}

export async function updateTaskAction(id: string, data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = updateTaskSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: "Dados inválidos" }

    const task = await updateTask(id, userId, parsed.data)
    revalidatePath("/tarefas")
    return { success: true, data: task }
  } catch (e) {
    return { success: false, error: "Erro ao atualizar tarefa" }
  }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await deleteTask(id, userId)
    revalidatePath("/tarefas")
    return { success: true, data: null }
  } catch (e) {
    return { success: false, error: "Erro ao deletar tarefa" }
  }
}
