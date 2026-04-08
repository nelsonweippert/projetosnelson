import { db } from "@/lib/db"
import type { CreateStudyInput, UpdateStudyInput, CreateStudySessionInput } from "@/types"

export async function getStudies(userId: string) {
  return db.study.findMany({
    where: { userId },
    include: { sessions: { orderBy: { date: "desc" }, take: 5 } },
    orderBy: { updatedAt: "desc" },
  })
}

export async function getStudyById(id: string, userId: string) {
  return db.study.findFirst({
    where: { id, userId },
    include: { sessions: { orderBy: { date: "desc" } } },
  })
}

export async function createStudy(userId: string, data: CreateStudyInput) {
  return db.study.create({ data: { ...data, userId } })
}

export async function updateStudy(id: string, userId: string, data: UpdateStudyInput) {
  return db.study.update({ where: { id, userId }, data })
}

export async function deleteStudy(id: string, userId: string) {
  return db.study.delete({ where: { id, userId } })
}

export async function addStudySession(userId: string, data: CreateStudySessionInput) {
  const session = await db.studySession.create({
    data: {
      studyId: data.studyId,
      hours: data.hours,
      note: data.note,
      date: data.date ?? new Date(),
    },
  })

  // Atualiza horas feitas e status automaticamente
  const study = await db.study.findFirst({
    where: { id: data.studyId, userId },
    include: { sessions: { select: { hours: true } } },
  })
  if (study) {
    const doneHours = study.sessions.reduce((sum, s) => sum + s.hours, 0)
    const status = doneHours >= study.totalHours && study.totalHours > 0 ? "COMPLETED" : "IN_PROGRESS"
    await db.study.update({ where: { id: data.studyId }, data: { doneHours, status } })
  }

  return session
}

export async function getStudyStats(userId: string) {
  const studies = await db.study.findMany({
    where: { userId },
    select: { status: true, doneHours: true },
  })
  return {
    total: studies.length,
    inProgress: studies.filter((s) => s.status === "IN_PROGRESS").length,
    completed: studies.filter((s) => s.status === "COMPLETED").length,
    doneHours: studies.reduce((sum, s) => sum + s.doneHours, 0),
  }
}
