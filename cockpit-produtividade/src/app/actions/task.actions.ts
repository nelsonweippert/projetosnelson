"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { createTaskSchema, updateTaskSchema } from "@/validations/task.validation"
import { createTask, updateTask, archiveTask, createSubtask, toggleSubtask, deleteSubtask } from "@/services/task.service"
import type { ActionResult } from "@/types"

async function getUserId() {
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
  } catch { return { success: false, error: "Erro ao criar tarefa" } }
}

export async function updateTaskAction(id: string, data: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const parsed = updateTaskSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: "Dados inválidos" }
    const task = await updateTask(id, userId, parsed.data)
    revalidatePath("/tarefas")
    return { success: true, data: task }
  } catch { return { success: false, error: "Erro ao atualizar tarefa" } }
}

export async function archiveTaskAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await archiveTask(id, userId)
    revalidatePath("/tarefas")
    return { success: true, data: null }
  } catch { return { success: false, error: "Erro ao arquivar tarefa" } }
}

export async function createSubtaskAction(taskId: string, title: string): Promise<ActionResult> {
  try {
    await getUserId()
    const subtask = await createSubtask(taskId, title)
    revalidatePath("/tarefas")
    return { success: true, data: subtask }
  } catch { return { success: false, error: "Erro ao criar subtarefa" } }
}

export async function toggleSubtaskAction(id: string, done: boolean): Promise<ActionResult> {
  try {
    await getUserId()
    const subtask = await toggleSubtask(id, done)
    revalidatePath("/tarefas")
    return { success: true, data: subtask }
  } catch { return { success: false, error: "Erro ao atualizar subtarefa" } }
}
