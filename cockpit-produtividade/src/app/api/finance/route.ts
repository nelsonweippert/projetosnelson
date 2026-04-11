import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTransactions, getFinanceSummary } from "@/services/finance.service"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1))

  const [transactions, summary] = await Promise.all([
    getTransactions(session.user.id, month, year),
    getFinanceSummary(session.user.id, month, year),
  ])

  return NextResponse.json({ transactions, summary })
}
