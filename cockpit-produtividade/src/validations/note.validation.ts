import { z } from "zod"

export const noteTypeEnum = z.enum([
  "FREE",
  "JOURNAL",
  "MEETING",
  "IDEA",
  "REFERENCE_SUMMARY",
])

export const createNoteSchema = z.object({
  title: z.string().max(200).optional().or(z.literal("")),
  content: z.string().min(1, "Conteúdo obrigatório"),
  type: noteTypeEnum.default("FREE"),
  source: z.string().optional(),
  date: z.coerce.date().optional(),
  isPinned: z.boolean().optional(),
  areaIds: z.array(z.string()).default([]),
  linkedTaskId: z.string().nullable().optional(),
  linkedEventId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
})

export const updateNoteSchema = createNoteSchema.partial()

export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
