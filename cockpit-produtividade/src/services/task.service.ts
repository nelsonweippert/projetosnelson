import { db } from "@/lib/db"
import type { CreateTaskInput, UpdateTaskInput } from "@/types"

export async function getTasks(userId: string) {
  return db.task.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  })
}

export async function getTaskById(id: string, userId: string) {
  return db.task.findFirst({ where: { id, userId } })
}

export async function createTask(userId: string, data: CreateTaskInput) {
  return db.task.create({
    data: { ...data, userId },
  })
}

export async function updateTask(id: string, userId: string, data: UpdateTaskInput) {
  return db.task.update({
    where: { id, userId },
    data,
  })
}

export async function deleteTask(id: string, userId: string) {
  return db.task.delete({ where: { id, userId } })
}

export async function getTaskStats(userId: string) {
  const tasks = await db.task.findMany({ where: { userId }, select: { status: true } })
  return {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "TODO").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    done: tasks.filter((t) => t.status === "DONE").length,
  }
}
