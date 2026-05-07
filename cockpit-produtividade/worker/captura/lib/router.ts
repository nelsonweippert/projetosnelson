/**
 * Router — persiste CapturedItem direto no Prisma.
 *
 * Worker é trusted (single-user, mesma máquina), então usa Prisma direto
 * em vez de bater num REST. Cada item é roteado independente.
 */

import { db } from "./db.js"
import type { CapturedItem } from "../schema/captured-item.js"

const slug = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")

function findByName<T extends { name: string }>(
  list: T[],
  hint: string | null | undefined,
) {
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

function findManyByNames<T extends { id: string; name: string }>(
  list: T[],
  hints: string[],
): T[] {
  if (!hints?.length) return []
  const matches = new Map<string, T>()
  for (const hint of hints) {
    const m = findByName(list, hint)
    if (m) matches.set(m.id, m)
  }
  return Array.from(matches.values())
}

export type RouterContext = {
  userId: string
  areas: { id: string; name: string }[]
  studies: { id: string; title: string }[]
  contacts: { id: string; name: string }[]
}

export async function loadUserContext(userId: string): Promise<RouterContext> {
  const [areas, studies, contacts] = await Promise.all([
    db.area.findMany({
      where: { userId, isArchived: false },
      select: { id: true, name: true },
    }),
    db.study.findMany({
      where: { userId, isArchived: false, status: { not: "COMPLETED" } },
      select: { id: true, title: true },
    }),
    db.contact.findMany({
      where: { userId, isArchived: false },
      select: { id: true, name: true },
    }),
  ])
  return { userId, areas, studies, contacts }
}

export type RouteResult =
  | {
      posted: true
      entity: "task" | "event" | "study_session" | "note"
      id: string
      payload: unknown
    }
  | { posted: false; reason: string; suggestions?: string[] }

export async function route(
  item: CapturedItem,
  ctx: RouterContext,
): Promise<RouteResult> {
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
      const area = findByName(ctx.areas, item.area_hint)
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
          ...(area && {
            areaId: area.id,
            areas: { create: [{ areaId: area.id }] },
          }),
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
      return {
        posted: true,
        entity: "study_session",
        id: result.id,
        payload: result,
      }
    }

    case "note": {
      const matchedAreas = findManyByNames(ctx.areas, item.area_hints ?? [])
      const matchedContact = findByName(ctx.contacts, item.contact_hint ?? null)
      const now = new Date()
      const result = await db.$transaction(async (tx) => {
        const note = await tx.note.create({
          data: {
            userId: ctx.userId,
            title: item.title ?? null,
            content: item.content,
            type: item.note_type,
            source: "telegram",
            date: now,
            ...(matchedContact && { contactId: matchedContact.id }),
            ...(matchedAreas.length > 0 && {
              areas: { create: matchedAreas.map((a) => ({ areaId: a.id })) },
            }),
          },
        })
        if (matchedContact) {
          await tx.contact.update({
            where: { id: matchedContact.id },
            data: { lastContactAt: now },
          })
        }
        return note
      })
      return { posted: true, entity: "note", id: result.id, payload: result }
    }

    case "ambiguous": {
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
