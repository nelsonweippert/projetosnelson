import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCalendarEvents, getTasksWithDueDateInMonth } from "@/services/calendar.service"
import { getStudiesPlannedInMonth } from "@/services/reference.service"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1))

  const [events, tasks, studies] = await Promise.all([
    getCalendarEvents(session.user.id, year, month),
    getTasksWithDueDateInMonth(session.user.id, year, month),
    getStudiesPlannedInMonth(session.user.id, year, month),
  ])

  return NextResponse.json({ events, tasks, studies })
}
