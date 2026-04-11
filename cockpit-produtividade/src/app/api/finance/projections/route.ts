import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getFixedTransactions, getTransactionsRange } from "@/services/finance.service"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Get last 3 months of real data + fixed transactions
  const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1)
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)

  const [recentTransactions, fixedTransactions] = await Promise.all([
    getTransactionsRange(session.user.id, threeMonthsAgo, endOfMonth),
    getFixedTransactions(session.user.id),
  ])

  // Compute monthly summaries for recent months
  const recentMonths: { month: number; year: number; income: number; expense: number }[] = []
  for (let i = -2; i <= 0; i++) {
    const m = new Date(currentYear, currentMonth + i, 1)
    const monthNum = m.getMonth() + 1
    const yearNum = m.getFullYear()
    const monthTxns = recentTransactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() + 1 === monthNum && d.getFullYear() === yearNum
    })
    recentMonths.push({
      month: monthNum,
      year: yearNum,
      income: monthTxns.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0),
      expense: monthTxns.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0),
    })
  }

  // Fixed recurring totals
  const fixedIncome = fixedTransactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0)
  const fixedExpense = fixedTransactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0)

  // Average variable (non-fixed) from recent 3 months
  const variableTxns = recentTransactions.filter((t) => !t.isFixed)
  const months3 = Math.max(recentMonths.length, 1)
  const avgVariableIncome = variableTxns.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0) / months3
  const avgVariableExpense = variableTxns.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0) / months3

  // Project 12 months ahead
  const projections: { month: number; year: number; income: number; expense: number; balance: number; accumulated: number }[] = []
  let accumulated = recentMonths.reduce((s, m) => s + m.income - m.expense, 0)

  for (let i = 1; i <= 12; i++) {
    const m = new Date(currentYear, currentMonth + i, 1)
    const projIncome = fixedIncome + avgVariableIncome
    const projExpense = fixedExpense + avgVariableExpense
    const balance = projIncome - projExpense
    accumulated += balance
    projections.push({
      month: m.getMonth() + 1,
      year: m.getFullYear(),
      income: Math.round(projIncome * 100) / 100,
      expense: Math.round(projExpense * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      accumulated: Math.round(accumulated * 100) / 100,
    })
  }

  // Fixed items breakdown
  const fixedItems = fixedTransactions.map((t) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amount: t.amount,
    category: t.category,
    area: t.area,
  }))

  return NextResponse.json({
    recentMonths,
    projections,
    fixedItems,
    fixedIncome,
    fixedExpense,
    avgVariableIncome: Math.round(avgVariableIncome * 100) / 100,
    avgVariableExpense: Math.round(avgVariableExpense * 100) / 100,
  })
}
