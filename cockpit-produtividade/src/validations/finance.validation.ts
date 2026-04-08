import { z } from "zod"

export const createTransactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().min(0.01),
  description: z.string().min(1).max(200),
  category: z.string().min(1),
  date: z.coerce.date(),
  isFixed: z.boolean().default(false),
  payment: z.enum(["PIX", "DEBIT", "CREDIT", "CASH", "OTHER"]).default("PIX"),
  notes: z.string().optional(),
  areaId: z.string().optional().nullable(),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
