"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { ActionResult } from "@/types"

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Não autorizado")
  return session.user.id
}

const schema = z.object({
  title: z.string().min(2),
  type: z.enum(["CLASS", "MEETING", "PARENT_MEETING", "ASSESSMENT", "EVENT", "HOLIDAY", "DEADLINE", "PERSONAL", "OTHER"]).default("CLASS"),
  startAt: z.string(),
  endAt: z.string().optional().nullable(),
  allDay: z.boolean().default(false),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).default("NONE"),
})

export async function createEventAction(input: z.infer<typeof schema>): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const data = schema.parse(input)
    const e = await db.calendarEvent.create({
      data: {
        userId,
        title: data.title,
        type: data.type,
        startAt: new Date(data.startAt),
        endAt: data.endAt ? new Date(data.endAt) : null,
        allDay: data.allDay,
        location: data.location || null,
        description: data.description || null,
        notes: data.notes || null,
        recurrence: data.recurrence === "NONE" ? null : data.recurrence,
      },
    })
    revalidatePath("/calendario")
    return { success: true, data: e }
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "Erro ao criar evento"
    return { success: false, error: msg || "Erro" }
  }
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    await db.calendarEvent.delete({ where: { id, userId } })
    revalidatePath("/calendario")
    return { success: true, data: null }
  } catch {
    return { success: false, error: "Erro ao excluir" }
  }
}
