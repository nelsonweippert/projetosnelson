import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getTransactions, getFinanceSummary } from "@/services/finance.service"
import { getAreas } from "@/services/area.service"
import { FinanceiroClient } from "./FinanceiroClient"

export default async function FinanceiroPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const now = new Date()
  const [transactions, summary, areas] = await Promise.all([
    getTransactions(session.user.id).catch(() => []),
    getFinanceSummary(session.user.id).catch(() => ({ totalIncome: 0, totalExpense: 0, balance: 0, savingsRate: 0, month: now.getMonth() + 1, year: now.getFullYear() })),
    getAreas(session.user.id).catch(() => []),
  ])
  return <FinanceiroClient initialTransactions={transactions} initialSummary={summary} areas={areas} />
}
