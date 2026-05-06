import { db } from "@/lib/db"

const INCLUDE_TASK = {
  areas: { include: { area: true } },
}

const INCLUDE_REF = {
  areas: { include: { area: true } },
  area: true,
}

/**
 * Inbox unificado — itens que precisam de triagem.
 *
 * - tasksWithoutDue: tasks abertas sem dueDate (sem agendamento concreto)
 * - unreadReferences: refs UNREAD ou READING há mais de 14 dias sem progresso
 * - reviewCaptures: tasks "[REVISAR]" do worker captura
 * - studiesNotStarted: projetos de estudo NOT_STARTED há mais de 7 dias
 *
 * Filosofia: capture first, organize later. Aqui é o "later".
 */
export async function getInboxItems(userId: string) {
  const now = new Date()
  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [tasksWithoutDue, unreadReferences, reviewCaptures, studiesNotStarted] =
    await Promise.all([
      db.task.findMany({
        where: {
          userId,
          isArchived: false,
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: null,
          // exclui captures REVISAR pra não duplicar
          NOT: { title: { startsWith: "[REVISAR]" } },
        },
        include: INCLUDE_TASK,
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.reference.findMany({
        where: {
          userId,
          isArchived: false,
          OR: [
            { status: "UNREAD" },
            {
              status: "READING",
              updatedAt: { lt: fourteenDaysAgo },
            },
          ],
        },
        include: INCLUDE_REF,
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        take: 50,
      }),
      db.task.findMany({
        where: {
          userId,
          isArchived: false,
          status: { in: ["TODO", "IN_PROGRESS"] },
          priority: "LOW",
          title: { startsWith: "[REVISAR]" },
        },
        include: INCLUDE_TASK,
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.study.findMany({
        where: {
          userId,
          isArchived: false,
          status: "NOT_STARTED",
          createdAt: { lt: sevenDaysAgo },
        },
        include: {
          area: true,
          areas: { include: { area: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
    ])

  return {
    tasksWithoutDue,
    unreadReferences,
    reviewCaptures,
    studiesNotStarted,
    counts: {
      tasksWithoutDue: tasksWithoutDue.length,
      unreadReferences: unreadReferences.length,
      reviewCaptures: reviewCaptures.length,
      studiesNotStarted: studiesNotStarted.length,
      total:
        tasksWithoutDue.length +
        unreadReferences.length +
        reviewCaptures.length +
        studiesNotStarted.length,
    },
  }
}
