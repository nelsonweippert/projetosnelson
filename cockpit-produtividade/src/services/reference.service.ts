import { db } from "@/lib/db"
import type { CreateReferenceInput } from "@/types"
import type { ReferenceStatus, ReferenceType, ReferencePriority } from "@/generated/prisma/client"

const INCLUDE_AREAS = { areas: { include: { area: true } }, area: true }

export async function getReferences(userId: string) {
  return db.reference.findMany({
    where: { userId, isArchived: false },
    include: INCLUDE_AREAS,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  })
}

export async function createReference(userId: string, data: CreateReferenceInput) {
  const { plannedDate, areaIds, ...rest } = data as CreateReferenceInput & { areaIds?: string[] }
  return db.reference.create({
    data: {
      ...rest,
      plannedDate: plannedDate ? new Date(plannedDate) : null,
      userId,
      ...(areaIds && areaIds.length > 0 && {
        areas: { create: areaIds.map((areaId) => ({ areaId })) },
        areaId: areaIds[0], // backwards compat
      }),
    },
    include: INCLUDE_AREAS,
  })
}

export async function getStudiesPlannedInMonth(userId: string, year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)
  return db.reference.findMany({
    where: {
      userId,
      isArchived: false,
      plannedDate: { gte: start, lte: end },
    },
    include: INCLUDE_AREAS,
    orderBy: { plannedDate: "asc" },
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
  areaIds?: string[]
}) {
  const { areaId, areaIds, ...rest } = data
  return db.reference.update({
    where: { id, userId },
    data: {
      ...rest,
      ...(areaIds !== undefined && {
        areas: {
          deleteMany: {},
          create: areaIds.map((areaId) => ({ areaId })),
        },
        areaId: areaIds.length > 0 ? areaIds[0] : null,
      }),
      ...(areaIds === undefined && areaId !== undefined && {
        areaId: areaId || null,
      }),
    },
    include: INCLUDE_AREAS,
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
