import { z } from "zod"

export const createStudySchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(200),
  description: z.string().optional(),
  category: z.string().min(1, "Categoria obrigatória"),
  totalHours: z.coerce.number().min(0).default(0),
  link: z.string().url("URL inválida").optional().or(z.literal("")),
})

export const updateStudySchema = createStudySchema.partial().extend({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "PAUSED"]).optional(),
  doneHours: z.coerce.number().min(0).optional(),
})

export const addSessionSchema = z.object({
  studyId: z.string().min(1),
  hours: z.coerce.number().min(0.25, "Mínimo 15 minutos").max(24),
  note: z.string().optional(),
  date: z.coerce.date().optional(),
})

export type CreateStudyInput = z.infer<typeof createStudySchema>
export type UpdateStudyInput = z.infer<typeof updateStudySchema>
export type AddSessionInput = z.infer<typeof addSessionSchema>
