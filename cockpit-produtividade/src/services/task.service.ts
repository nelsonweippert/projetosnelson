import { db } from "@/lib/db"
import type { CreateTaskInput, UpdateTaskInput } from "@/types"

export async function getTasks(userId: string) {
  return db.task.findMany({
    where: { userId, isArchived: false },
    include: {
      areas: { include: { area: true } },
      subtasks: { orderBy: { order: "asc" } },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  })
}

export async function getTaskById(id: string, userId: string) {
  return db.task.findFirst({
    where: { id, userId },
    include: {
      areas: { include: { area: true } },
      subtasks: { orderBy: { order: "asc" } },
    },
  })
}

export async function createTask(userId: string, data: CreateTaskInput) {
  const { areaIds, ...taskData } = data
  return db.task.create({
    data: {
      ...taskData,
      userId,
      areas: areaIds?.length
        ? { create: areaIds.map((areaId) => ({ areaId })) }
        : undefined,
    },
    include: {
      areas: { include: { area: true } },
      subtasks: true,
    },
  })
}

export async function updateTask(id: string, userId: string, data: UpdateTaskInput) {
  const { areaIds, ...taskData } = data as UpdateTaskInput & { areaIds?: string[] }
  if (taskData.status === "DONE" && !taskData.completedAt) {
    taskData.completedAt = new Date()
  }
  return db.task.update({
    where: { id, userId },
    data: {
      ...taskData,
      ...(areaIds !== undefined && {
        areas: {
          deleteMany: {},
          create: areaIds.map((areaId) => ({ areaId })),
        },
      }),
    },
    include: {
      areas: { include: { area: true } },
      subtasks: { orderBy: { order: "asc" } },
    },
  })
}

export async function archiveTask(id: string, userId: string) {
  return db.task.update({ where: { id, userId }, data: { isArchived: true } })
}

export async function createSubtask(taskId: string, title: string) {
  return db.subtask.create({ data: { taskId, title } })
}

export async function toggleSubtask(id: string, done: boolean) {
  return db.subtask.update({ where: { id }, data: { done } })
}

export async function deleteSubtask(id: string) {
  return db.subtask.delete({ where: { id } })
}

export async function getTaskStats(userId: string) {
  const tasks = await db.task.findMany({
    where: { userId, isArchived: false },
    select: { status: true },
  })
  return {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "TODO").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    done: tasks.filter((t) => t.status === "DONE").length,
    cancelled: tasks.filter((t) => t.status === "CANCELLED").length,
  }
}
