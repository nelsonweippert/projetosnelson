import { db } from "@/lib/db"
import type { CreateReferenceInput } from "@/types"

export async function getReferences(userId: string) {
  return db.reference.findMany({
    where: { userId, isArchived: false },
    include: { area: true },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  })
}

export async function createReference(userId: string, data: CreateReferenceInput) {
  return db.reference.create({
    data: { ...data, userId },
    include: { area: true },
  })
}

export async function updateReference(id: string, userId: string, data: Partial<CreateReferenceInput> & { status?: string; comments?: string; readAt?: Date | null }) {
  return db.reference.update({ where: { id, userId }, data })
}

export async function archiveReference(id: string, userId: string) {
  return db.reference.update({ where: { id, userId }, data: { isArchived: true } })
}

export async function getReferenceStats(userId: string) {
  const refs = await db.reference.findMany({ where: { userId, isArchived: false }, select: { status: true } })
  return {
    total: refs.length,
    unread: refs.filter((r) => r.status === "UNREAD").length,
    reading: refs.filter((r) => r.status === "READING").length,
    read: refs.filter((r) => r.status === "READ").length,
  }
}
