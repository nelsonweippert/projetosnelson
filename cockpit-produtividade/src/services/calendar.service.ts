import { db } from "@/lib/db"
import type { CreateCalendarEventInput, UpdateCalendarEventInput } from "@/validations/calendar.validation"

export async function getCalendarEvents(userId: string, year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)

  return db.calendarEvent.findMany({
    where: {
      userId,
      isArchived: false,
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
  })
}

export async function createCalendarEvent(userId: string, data: CreateCalendarEventInput) {
  return db.calendarEvent.create({
    data: {
      title: data.title,
      type: data.type ?? "GENERAL",
      date: new Date(data.date),
      endDate: data.endDate ? new Date(data.endDate) : null,
      description: data.description ?? null,
      location: data.location ?? null,
      attendees: data.attendees ?? [],
      notes: data.notes ?? null,
      areaId: data.areaId ?? null,
      userId,
    },
  })
}

export async function updateCalendarEvent(id: string, userId: string, data: UpdateCalendarEventInput) {
  return db.calendarEvent.update({
    where: { id, userId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.attendees !== undefined && { attendees: data.attendees }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.areaId !== undefined && { areaId: data.areaId }),
    },
  })
}

export async function archiveCalendarEvent(id: string, userId: string) {
  return db.calendarEvent.update({
    where: { id, userId },
    data: { isArchived: true },
  })
}

export async function getTasksWithDueDateInMonth(userId: string, year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)

  return db.task.findMany({
    where: {
      userId,
      isArchived: false,
      dueDate: { gte: start, lte: end },
    },
    include: {
      areas: { include: { area: true } },
    },
    orderBy: { dueDate: "asc" },
  })
}
