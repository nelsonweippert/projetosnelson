import { z } from "zod"

export const createTaskSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(200),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: z.coerce.date().optional().nullable(),
  tags: z.array(z.string()).default([]),
})

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
