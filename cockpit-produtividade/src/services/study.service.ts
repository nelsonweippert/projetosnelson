import { db } from "@/lib/db"
import type { StudyStatus } from "@/generated/prisma/client"

const INCLUDE_RELATIONS = {
  area: true,
  areas: { include: { area: true } },
  sessions: { orderBy: { date: "desc" as const }, take: 30 },
  _count: { select: { sessions: true } },
}

export async function getStudies(userId: string) {
  return db.study.findMany({
    where: { userId, isArchived: false },
    include: INCLUDE_RELATIONS,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  })
}

export async function getStudyById(id: string, userId: string) {
  return db.study.findFirst({
    where: { id, userId },
    include: {
      area: true,
      areas: { include: { area: true } },
      sessions: { orderBy: { date: "desc" } },
    },
  })
}

export async function createStudy(
  userId: string,
  data: {
    title: string
    description?: string
    category: string
    totalHours?: number
    link?: string
    areaIds?: string[]
  },
) {
  const { areaIds, link, ...rest } = data
  return db.study.create({
    data: {
      ...rest,
      link: link && link.length > 0 ? link : null,
      userId,
      ...(areaIds && areaIds.length > 0 && {
        areas: { create: areaIds.map((areaId) => ({ areaId })) },
        areaId: areaIds[0],
      }),
    },
    include: INCLUDE_RELATIONS,
  })
}

export async function updateStudy(
  id: string,
  userId: string,
  data: {
    title?: string
    description?: string
    category?: string
    totalHours?: number
    doneHours?: number
    link?: string | null
    status?: StudyStatus
    areaIds?: string[]
  },
) {
  const { areaIds, ...rest } = data
  return db.study.update({
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
    },
    include: INCLUDE_RELATIONS,
  })
}

export async function archiveStudy(id: string, userId: string) {
  return db.study.update({ where: { id, userId }, data: { isArchived: true } })
}

export async function addStudySession(
  userId: string,
  data: { studyId: string; hours: number; note?: string; date?: Date },
) {
  return db.$transaction(async (tx) => {
    const study = await tx.study.findFirst({
      where: { id: data.studyId, userId },
    })
    if (!study) throw new Error("Estudo não encontrado")

    const session = await tx.studySession.create({
      data: {
        studyId: data.studyId,
        userId,
        hours: data.hours,
        note: data.note,
        date: data.date ?? new Date(),
      },
    })

    const newDone = study.doneHours + data.hours
    const newStatus =
      study.totalHours > 0 && newDone >= study.totalHours
        ? "COMPLETED"
        : study.status === "NOT_STARTED"
        ? "IN_PROGRESS"
        : study.status

    await tx.study.update({
      where: { id: data.studyId },
      data: {
        doneHours: newDone,
        status: newStatus,
      },
    })

    return session
  })
}

export async function deleteStudySession(id: string, userId: string) {
  return db.$transaction(async (tx) => {
    const session = await tx.studySession.findFirst({ where: { id, userId } })
    if (!session) throw new Error("Sessão não encontrada")

    const study = await tx.study.findUnique({ where: { id: session.studyId } })
    if (!study) throw new Error("Estudo não encontrado")

    await tx.studySession.delete({ where: { id } })

    await tx.study.update({
      where: { id: session.studyId },
      data: {
        doneHours: Math.max(0, study.doneHours - session.hours),
      },
    })
    return { id }
  })
}

export async function getStudyStats(userId: string) {
  const studies = await db.study.findMany({
    where: { userId, isArchived: false },
    select: { status: true, totalHours: true, doneHours: true },
  })

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [hoursLast7d, hoursLast30d, sessionsLast7d] = await Promise.all([
    db.studySession.aggregate({
      where: { userId, date: { gte: sevenDaysAgo } },
      _sum: { hours: true },
    }),
    db.studySession.aggregate({
      where: { userId, date: { gte: thirtyDaysAgo } },
      _sum: { hours: true },
    }),
    db.studySession.count({
      where: { userId, date: { gte: sevenDaysAgo } },
    }),
  ])

  return {
    total: studies.length,
    notStarted: studies.filter((s) => s.status === "NOT_STARTED").length,
    inProgress: studies.filter((s) => s.status === "IN_PROGRESS").length,
    completed: studies.filter((s) => s.status === "COMPLETED").length,
    paused: studies.filter((s) => s.status === "PAUSED").length,
    totalDoneHours: studies.reduce((s, x) => s + x.doneHours, 0),
    totalPlannedHours: studies.reduce((s, x) => s + x.totalHours, 0),
    hoursLast7d: hoursLast7d._sum.hours ?? 0,
    hoursLast30d: hoursLast30d._sum.hours ?? 0,
    sessionsLast7d,
  }
}
