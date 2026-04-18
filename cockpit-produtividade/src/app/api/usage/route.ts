import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const userId = session.user.id
  const now = new Date()

  // Today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // This week (Monday)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  // This month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [todayUsage, weekUsage, monthUsage, allUsage, recentCalls] = await Promise.all([
    db.apiUsage.aggregate({ where: { userId, createdAt: { gte: todayStart } }, _sum: { inputTokens: true, outputTokens: true, costUsd: true }, _count: true }),
    db.apiUsage.aggregate({ where: { userId, createdAt: { gte: weekStart } }, _sum: { inputTokens: true, outputTokens: true, costUsd: true }, _count: true }),
    db.apiUsage.aggregate({ where: { userId, createdAt: { gte: monthStart } }, _sum: { inputTokens: true, outputTokens: true, costUsd: true }, _count: true }),
    db.apiUsage.aggregate({ where: { userId }, _sum: { inputTokens: true, outputTokens: true, costUsd: true }, _count: true }),
    db.apiUsage.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ])

  // By action breakdown (this month)
  const byAction = await db.apiUsage.groupBy({
    by: ["action"],
    where: { userId, createdAt: { gte: monthStart } },
    _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    _count: true,
    orderBy: { _count: { action: "desc" } },
  })

  // Daily usage (last 14 days)
  const fourteenDaysAgo = new Date(todayStart)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)
  const dailyRaw = await db.apiUsage.findMany({
    where: { userId, createdAt: { gte: fourteenDaysAgo } },
    select: { createdAt: true, costUsd: true, inputTokens: true, outputTokens: true },
    orderBy: { createdAt: "asc" },
  })

  const daily: Record<string, { calls: number; cost: number; tokens: number }> = {}
  for (let d = 0; d < 14; d++) {
    const date = new Date(fourteenDaysAgo)
    date.setDate(date.getDate() + d)
    daily[date.toISOString().split("T")[0]] = { calls: 0, cost: 0, tokens: 0 }
  }
  for (const r of dailyRaw) {
    const key = new Date(r.createdAt).toISOString().split("T")[0]
    if (daily[key]) {
      daily[key].calls++
      daily[key].cost += r.costUsd
      daily[key].tokens += r.inputTokens + r.outputTokens
    }
  }

  return NextResponse.json({
    today: { calls: todayUsage._count, tokens: (todayUsage._sum.inputTokens ?? 0) + (todayUsage._sum.outputTokens ?? 0), cost: todayUsage._sum.costUsd ?? 0 },
    week: { calls: weekUsage._count, tokens: (weekUsage._sum.inputTokens ?? 0) + (weekUsage._sum.outputTokens ?? 0), cost: weekUsage._sum.costUsd ?? 0 },
    month: { calls: monthUsage._count, tokens: (monthUsage._sum.inputTokens ?? 0) + (monthUsage._sum.outputTokens ?? 0), cost: monthUsage._sum.costUsd ?? 0 },
    total: { calls: allUsage._count, tokens: (allUsage._sum.inputTokens ?? 0) + (allUsage._sum.outputTokens ?? 0), cost: allUsage._sum.costUsd ?? 0 },
    byAction: byAction.map((a) => ({ action: a.action, calls: a._count, tokens: (a._sum.inputTokens ?? 0) + (a._sum.outputTokens ?? 0), cost: a._sum.costUsd ?? 0 })),
    daily: Object.entries(daily).map(([date, data]) => ({ date, ...data })),
    recentCalls: recentCalls.map((c) => ({ id: c.id, action: c.action, tokens: c.inputTokens + c.outputTokens, cost: c.costUsd, duration: c.durationMs, createdAt: c.createdAt })),
  })
}
