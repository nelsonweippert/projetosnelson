import { db } from "@/lib/db"
import type { CreateExpenseInput, CreateIncomeInput, FinanceSummary } from "@/types"

export async function getExpenses(userId: string, month?: number, year?: number) {
  const now = new Date()
  const m = month ?? now.getMonth() + 1
  const y = year ?? now.getFullYear()
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0, 23, 59, 59)

  return db.expense.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: "desc" },
  })
}

export async function getIncomes(userId: string, month?: number, year?: number) {
  const now = new Date()
  const m = month ?? now.getMonth() + 1
  const y = year ?? now.getFullYear()
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0, 23, 59, 59)

  return db.income.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: "desc" },
  })
}

export async function createExpense(userId: string, data: CreateExpenseInput) {
  return db.expense.create({ data: { ...data, userId } })
}

export async function createIncome(userId: string, data: CreateIncomeInput) {
  return db.income.create({ data: { ...data, userId } })
}

export async function deleteExpense(id: string, userId: string) {
  return db.expense.delete({ where: { id, userId } })
}

export async function deleteIncome(id: string, userId: string) {
  return db.income.delete({ where: { id, userId } })
}

export async function getFinanceSummary(userId: string, month?: number, year?: number): Promise<FinanceSummary> {
  const now = new Date()
  const m = month ?? now.getMonth() + 1
  const y = year ?? now.getFullYear()

  const [expenses, incomes] = await Promise.all([
    getExpenses(userId, m, y),
    getIncomes(userId, m, y),
  ])

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    month: m,
    year: y,
  }
}
