import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id: areaId } = await params
  const userId = session.user.id

  const [tasks, references, contents, transactions, calendarEvents] = await Promise.all([
    db.task.findMany({
      where: { userId, isArchived: false, areas: { some: { areaId } } },
      include: { areas: { include: { area: true } }, subtasks: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    db.reference.findMany({
      where: { userId, isArchived: false, OR: [{ areaId }, { areas: { some: { areaId } } }] },
      include: { areas: { include: { area: true } }, area: true },
      orderBy: { createdAt: "desc" },
    }),
    db.content.findMany({
      where: { userId, isArchived: false, OR: [{ areaId }, { areas: { some: { areaId } } }] },
      include: { area: true, areas: { include: { area: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.transaction.findMany({
      where: { userId, isArchived: false, areaId },
      include: { area: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
    db.calendarEvent.findMany({
      where: { userId, isArchived: false, OR: [{ areaId }, { areas: { some: { areaId } } }] },
      include: { area: true, areas: { include: { area: true } } },
      orderBy: { date: "desc" },
    }),
  ])

  return NextResponse.json({ tasks, references, contents, transactions, calendarEvents })
}
