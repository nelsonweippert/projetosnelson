import { auth } from "@/lib/auth"
import { getTransactions, getFinanceSummary } from "@/services/finance.service"
import { getAreas } from "@/services/area.service"
import { FinanceiroClient } from "./FinanceiroClient"

export default async function FinanceiroPage() {
  const session = await auth()
  const userId = session?.user?.id!
  const [transactions, summary, areas] = await Promise.all([
    getTransactions(userId),
    getFinanceSummary(userId),
    getAreas(userId),
  ])
  return <FinanceiroClient initialTransactions={transactions} initialSummary={summary} areas={areas} />
}
