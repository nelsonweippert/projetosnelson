"use server"

import { auth } from "@/lib/auth"
import { createCalendarEventSchema, updateCalendarEventSchema } from "@/validations/calendar.validation"
import {
  createCalendarEvent,
  updateCalendarEvent,
  archiveCalendarEvent,
} from "@/services/calendar.service"
import type { ActionResult } from "@/types"

async function getUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autenticado")
  return session.user.id
}

export async function createCalendarEventAction(raw: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = createCalendarEventSchema.parse(raw)
    const event = await createCalendarEvent(userId, data)
    return { success: true, data: event }
  } catch (e: any) {
    return { success: false, error: e.message ?? "Erro ao criar evento" }
  }
}

export async function updateCalendarEventAction(id: string, raw: unknown): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = updateCalendarEventSchema.parse(raw)
    const event = await updateCalendarEvent(id, userId, data)
    return { success: true, data: event }
  } catch (e: any) {
    return { success: false, error: e.message ?? "Erro ao atualizar evento" }
  }
}

export async function archiveCalendarEventAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await archiveCalendarEvent(id, userId)
    return { success: true, data: null }
  } catch (e: any) {
    return { success: false, error: e.message ?? "Erro ao arquivar evento" }
  }
}
