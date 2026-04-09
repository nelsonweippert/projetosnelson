import { z } from "zod"

export const createCalendarEventSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  type: z.enum(["MEETING", "ATA", "ACTION", "GENERAL"]).default("GENERAL"),
  date: z.string().min(1, "Data obrigatória"),
  endDate: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string()).default([]),
  notes: z.string().optional(),
  areaId: z.string().nullable().optional(),
})

export const updateCalendarEventSchema = createCalendarEventSchema.partial()

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>
