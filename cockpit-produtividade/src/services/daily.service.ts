import { db } from "@/lib/db"

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const endOfDay = (d: Date) => {
  const e = new Date(d)
  e.setHours(23, 59, 59, 999)
  return e
}

const INCLUDE_TASK = {
  areas: { include: { area: true } },
  subtasks: { orderBy: { order: "asc" as const } },
}

/**
 * Pacote de dados pra rota /daily — ritual de review.
 *
 * - completedYesterday: tasks marcadas DONE entre ontem 00:00 e 23:59
 * - todayTasks: tasks abertas com dueDate hoje
 * - carryOvers: tasks abertas com dueDate < hoje (atrasadas)
 * - todayEvents: eventos de calendário com date entre hoje 00:00 e 23:59
 * - reviewCaptures: tasks priority=LOW com title começando com "[REVISAR]"
 *   (criadas pelo worker captura-rotina quando classifier ficou ambíguo)
 */
export async function getDailyDigest(userId: string, ref: Date = new Date()) {
  const todayStart = startOfDay(ref)
  const todayEnd = endOfDay(ref)
  const yesterday = new Date(todayStart)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStart = startOfDay(yesterday)
  const yesterdayEnd = endOfDay(yesterday)

  const [completedYesterday, todayTasks, carryOvers, todayEvents, reviewCaptures] =
    await Promise.all([
      db.task.findMany({
        where: {
          userId,
          isArchived: false,
          status: "DONE",
          completedAt: { gte: yesterdayStart, lte: yesterdayEnd },
        },
        include: INCLUDE_TASK,
        orderBy: { completedAt: "desc" },
      }),
      db.task.findMany({
        where: {
          userId,
          isArchived: false,
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: { gte: todayStart, lte: todayEnd },
        },
        include: INCLUDE_TASK,
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      }),
      db.task.findMany({
        where: {
          userId,
          isArchived: false,
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: { lt: todayStart, not: null },
        },
        include: INCLUDE_TASK,
        orderBy: { dueDate: "asc" },
      }),
      db.calendarEvent.findMany({
        where: {
          userId,
          isArchived: false,
          date: { gte: todayStart, lte: todayEnd },
        },
        include: { area: true },
        orderBy: { date: "asc" },
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
        take: 10,
      }),
    ])

  return {
    completedYesterday,
    todayTasks,
    carryOvers,
    todayEvents,
    reviewCaptures,
  }
}

/** Prompts de reflexão rotativos por dia da semana — sem LLM no MVP. */
const REFLECTION_PROMPTS = [
  "Domingo: olhando a semana inteira, qual hábito te puxou pra cima? Qual te puxou pra baixo?",
  "Segunda: o que vai te trazer foco hoje? E o que pode atrapalhar?",
  "Terça: qual decisão pequena de hoje pode mudar o ritmo da semana?",
  "Quarta: do que você está adiando? O que mudaria se fizesse hoje?",
  "Quinta: o que aprendeu nessas últimas 48h que vale registrar?",
  "Sexta: o que você fechou esta semana que merece reconhecimento?",
  "Sábado: do que você precisa descansar? Como vai cuidar disso?",
]

export function getReflectionPrompt(ref: Date = new Date()): string {
  return REFLECTION_PROMPTS[ref.getDay()]
}
