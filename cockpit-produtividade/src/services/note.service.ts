import { db } from "@/lib/db"
import type { NoteType } from "@/generated/prisma/client"

const INCLUDE_RELATIONS = {
  areas: { include: { area: true } },
  linkedTask: { select: { id: true, title: true, status: true } },
  linkedEvent: { select: { id: true, title: true, date: true } },
}

export async function getNotes(
  userId: string,
  filters?: { type?: NoteType; areaId?: string; q?: string },
) {
  const where: Record<string, unknown> = { userId, isArchived: false }
  if (filters?.type) where.type = filters.type
  if (filters?.areaId) {
    where.areas = { some: { areaId: filters.areaId } }
  }
  if (filters?.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { content: { contains: filters.q, mode: "insensitive" } },
    ]
  }

  return db.note.findMany({
    where,
    include: INCLUDE_RELATIONS,
    orderBy: [{ isPinned: "desc" }, { date: "desc" }],
  })
}

export async function getNoteById(id: string, userId: string) {
  return db.note.findFirst({
    where: { id, userId },
    include: INCLUDE_RELATIONS,
  })
}

export async function createNote(
  userId: string,
  data: {
    title?: string
    content: string
    type?: NoteType
    source?: string
    date?: Date
    isPinned?: boolean
    areaIds?: string[]
    linkedTaskId?: string | null
    linkedEventId?: string | null
  },
) {
  const { areaIds, title, ...rest } = data
  return db.note.create({
    data: {
      ...rest,
      title: title && title.length > 0 ? title : null,
      userId,
      ...(areaIds && areaIds.length > 0 && {
        areas: { create: areaIds.map((areaId) => ({ areaId })) },
      }),
    },
    include: INCLUDE_RELATIONS,
  })
}

export async function updateNote(
  id: string,
  userId: string,
  data: {
    title?: string
    content?: string
    type?: NoteType
    date?: Date
    isPinned?: boolean
    areaIds?: string[]
    linkedTaskId?: string | null
    linkedEventId?: string | null
  },
) {
  const { areaIds, title, ...rest } = data
  return db.note.update({
    where: { id, userId },
    data: {
      ...rest,
      ...(title !== undefined && {
        title: title.length > 0 ? title : null,
      }),
      ...(areaIds !== undefined && {
        areas: {
          deleteMany: {},
          create: areaIds.map((areaId) => ({ areaId })),
        },
      }),
    },
    include: INCLUDE_RELATIONS,
  })
}

export async function archiveNote(id: string, userId: string) {
  return db.note.update({ where: { id, userId }, data: { isArchived: true } })
}

export async function togglePinNote(id: string, userId: string) {
  const note = await db.note.findFirst({ where: { id, userId } })
  if (!note) throw new Error("Nota não encontrada")
  return db.note.update({
    where: { id, userId },
    data: { isPinned: !note.isPinned },
  })
}

export async function getNotesByArea(userId: string, areaId: string) {
  return db.note.findMany({
    where: {
      userId,
      isArchived: false,
      areas: { some: { areaId } },
    },
    include: INCLUDE_RELATIONS,
    orderBy: [{ isPinned: "desc" }, { date: "desc" }],
    take: 50,
  })
}

export async function getNoteStats(userId: string) {
  const notes = await db.note.findMany({
    where: { userId, isArchived: false },
    select: { type: true, date: true },
  })
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return {
    total: notes.length,
    last7d: notes.filter((n) => n.date >= sevenDaysAgo).length,
    byType: {
      free: notes.filter((n) => n.type === "FREE").length,
      journal: notes.filter((n) => n.type === "JOURNAL").length,
      meeting: notes.filter((n) => n.type === "MEETING").length,
      idea: notes.filter((n) => n.type === "IDEA").length,
      referenceSummary: notes.filter((n) => n.type === "REFERENCE_SUMMARY").length,
    },
  }
}
