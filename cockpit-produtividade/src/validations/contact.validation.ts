import { z } from "zod"

const handle = z
  .string()
  .max(100)
  .transform((v) => v.trim().replace(/^@/, ""))
  .refine((v) => v === "" || /^[A-Za-z0-9_]{1,32}$/.test(v), {
    message: "Handle inválido (use letras, números, _; sem @)",
  })

export const createContactSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(120),
  company: z.string().max(120).optional().or(z.literal("")),
  project: z.string().max(120).optional().or(z.literal("")),
  telegram: handle.optional().or(z.literal("")),
  twitter: handle.optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  areaId: z.string().nullable().optional(),
})

export const updateContactSchema = createContactSchema.partial()

export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
