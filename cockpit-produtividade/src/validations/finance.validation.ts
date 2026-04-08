import { z } from "zod"

const categories = [
  "MORADIA", "ALIMENTACAO", "TRANSPORTE", "SAUDE",
  "EDUCACAO", "LAZER", "INVESTIMENTO", "SALARIO", "FREELANCE", "OUTROS",
] as const

export const createExpenseSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória").max(200),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  category: z.enum(categories),
  date: z.coerce.date(),
  recurring: z.boolean().default(false),
})

export const createIncomeSchema = createExpenseSchema

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>
