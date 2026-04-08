import { db } from "@/lib/db"
import type { CreateReferenceInput } from "@/types"
import type { ReferenceStatus, ReferenceType, ReferencePriority } from "@/generated/prisma/client"

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

export async function updateReference(id: string, userId: string, data: {
  title?: string
  url?: string
  source?: string | null
  type?: ReferenceType
  status?: ReferenceStatus
  priority?: ReferencePriority
  tags?: string[]
  comments?: string | null
  highlights?: string[]
  readAt?: Date | null
  areaId?: string | null
}) {
  const { areaId, ...rest } = data
  return db.reference.update({
    where: { id, userId },
    data: {
      ...rest,
      ...(areaId !== undefined && { area: areaId ? { connect: { id: areaId } } : { disconnect: true } }),
    },
  })
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
