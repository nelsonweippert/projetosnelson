import { db } from "@/lib/db"
import type { CreateTransactionInput, FinanceSummary } from "@/types"

export async function getTransactions(userId: string, month?: number, year?: number) {
  const now = new Date()
  const m = month ?? now.getMonth() + 1
  const y = year ?? now.getFullYear()
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0, 23, 59, 59)

  return db.transaction.findMany({
    where: { userId, isArchived: false, date: { gte: start, lte: end } },
    include: { area: true },
    orderBy: { date: "desc" },
  })
}

export async function createTransaction(userId: string, data: CreateTransactionInput) {
  return db.transaction.create({ data: { ...data, userId } })
}

export async function archiveTransaction(id: string, userId: string) {
  return db.transaction.update({ where: { id, userId }, data: { isArchived: true } })
}

export async function getFinanceSummary(userId: string, month?: number, year?: number): Promise<FinanceSummary> {
  const transactions = await getTransactions(userId, month, year)
  const totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
  const now = new Date()
  return {
    totalIncome,
    totalExpense,
    balance,
    savingsRate,
    month: month ?? now.getMonth() + 1,
    year: year ?? now.getFullYear(),
  }
}

export async function getExpensesByCategory(userId: string, month?: number, year?: number) {
  const transactions = await getTransactions(userId, month, year)
  const expenses = transactions.filter((t) => t.type === "EXPENSE")
  const byCategory: Record<string, number> = {}
  for (const t of expenses) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount
  }
  return Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({ category, amount }))
}

export async function getFixedTransactions(userId: string) {
  return db.transaction.findMany({
    where: { userId, isArchived: false, isFixed: true },
    include: { area: true },
    orderBy: { date: "desc" },
  })
}

export async function getTransactionsRange(userId: string, startDate: Date, endDate: Date) {
  return db.transaction.findMany({
    where: { userId, isArchived: false, date: { gte: startDate, lte: endDate } },
    include: { area: true },
    orderBy: { date: "desc" },
  })
}

export async function getFinancialGoals(userId: string) {
  return db.financialGoal.findMany({ where: { userId, isArchived: false }, orderBy: { createdAt: "desc" } })
}

export async function createFinancialGoal(userId: string, data: { name: string; targetAmount: number; deadline?: Date; category?: string }) {
  return db.financialGoal.create({ data: { ...data, userId } })
}
