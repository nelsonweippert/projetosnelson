/**
 * Router — persiste CapturedItem direto no Prisma.
 *
 * Ao contrário do worker errado anterior (que batia em REST), aqui o
 * worker é trusted (single-user app, mesma máquina) e usa Prisma direto.
 */

import { db } from "./db.js"
import type { CapturedItem } from "../schema/captured-item.js"

const slug = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")

function findByName<T extends { name: string }>(list: T[], hint: string | null) {
  if (!hint) return null
  const target = slug(hint)
  if (!target) return null
  return (
    list.find((x) => {
      const name = slug(x.name)
      return name.includes(target) || target.includes(name)
    }) ?? null
  )
}

export type RouterContext = {
  userId: string
  areas: { id: string; name: string }[]
  studies: { id: string; title: string }[]
}

export async function loadUserContext(userId: string): Promise<RouterContext> {
  const [areas, studies] = await Promise.all([
    db.area.findMany({
      where: { userId, isArchived: false },
      select: { id: true, name: true },
    }),
    db.study.findMany({
      where: { userId, isArchived: false, status: { not: "COMPLETED" } },
      select: { id: true, title: true },
    }),
  ])
  return { userId, areas, studies }
}

export type RouteResult =
  | { posted: true; entity: "task" | "event" | "study_session"; id: string; payload: unknown }
  | { posted: false; reason: string; suggestions?: string[] }

export async function route(item: CapturedItem, ctx: RouterContext): Promise<RouteResult> {
  switch (item.type) {
    case "task": {
      const area = findByName(ctx.areas, item.area_hint)
      const task = await db.task.create({
        data: {
          userId: ctx.userId,
          title: item.title,
          description: item.description ?? null,
          priority: item.priority,
          status: "TODO",
          dueDate: item.due_date ? new Date(item.due_date) : null,
          ...(area && { areas: { create: [{ areaId: area.id }] } }),
        },
      })
      return { posted: true, entity: "task", id: task.id, payload: task }
    }

    case "event": {
      const event = await db.calendarEvent.create({
        data: {
          userId: ctx.userId,
          title: item.title,
          type: "GENERAL",
          date: new Date(item.date),
          endDate: item.end_date ? new Date(item.end_date) : null,
          location: item.location ?? null,
          description: item.description ?? null,
          attendees: item.attendees ?? [],
        },
      })
      return { posted: true, entity: "event", id: event.id, payload: event }
    }

    case "study_session": {
      const study = ctx.studies.find((s) => {
        const a = slug(s.title)
        const b = slug(item.topic_hint)
        return a.includes(b) || b.includes(a)
      })
      if (!study) {
        return {
          posted: false,
          reason: `topic "${item.topic_hint}" não casou com nenhum projeto ativo`,
        }
      }
      const result = await db.$transaction(async (tx) => {
        const studyDb = await tx.study.findUnique({ where: { id: study.id } })
        if (!studyDb) throw new Error("study sumiu")
        const session = await tx.studySession.create({
          data: {
            studyId: study.id,
            userId: ctx.userId,
            hours: item.hours,
            note: item.note ?? null,
            date: new Date(),
          },
        })
        const newDone = studyDb.doneHours + item.hours
        const newStatus =
          studyDb.totalHours > 0 && newDone >= studyDb.totalHours
            ? "COMPLETED"
            : studyDb.status === "NOT_STARTED"
            ? "IN_PROGRESS"
            : studyDb.status
        await tx.study.update({
          where: { id: study.id },
          data: { doneHours: newDone, status: newStatus },
        })
        return session
      })
      return { posted: true, entity: "study_session", id: result.id, payload: result }
    }

    case "ambiguous": {
      // Cria task LOW pra revisão manual com a transcrição original
      const task = await db.task.create({
        data: {
          userId: ctx.userId,
          title: `[REVISAR] ${item.raw.slice(0, 100)}`,
          description: `Sugestões do classificador:\n${item.suggestions.map((s) => "• " + s).join("\n")}\n\nTranscrição original:\n${item.raw}`,
          priority: "LOW",
          status: "TODO",
        },
      })
      return { posted: true, entity: "task", id: task.id, payload: task }
    }

    default: {
      const _exhaustive: never = item
      return { posted: false, reason: `tipo desconhecido` }
    }
  }
}
