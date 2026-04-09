import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCalendarEvents, getTasksWithDueDateInMonth } from "@/services/calendar.service"
import { getStudiesPlannedInMonth } from "@/services/reference.service"
import { getAreas } from "@/services/area.service"
import { CalendarioClient } from "./CalendarioClient"

export default async function CalendarioPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [events, tasks, studies, areas] = await Promise.all([
    getCalendarEvents(session.user.id, year, month).catch(() => []),
    getTasksWithDueDateInMonth(session.user.id, year, month).catch(() => []),
    getStudiesPlannedInMonth(session.user.id, year, month).catch(() => []),
    getAreas(session.user.id).catch(() => []),
  ])

  return <CalendarioClient initialEvents={events} initialTasks={tasks} initialStudies={studies} areas={areas} initialYear={year} initialMonth={month} />
}
