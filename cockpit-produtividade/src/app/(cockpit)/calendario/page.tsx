import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCalendarEvents, getTasksWithDueDateInMonth } from "@/services/calendar.service"
import { getAreas } from "@/services/area.service"
import { CalendarioClient } from "./CalendarioClient"

export default async function CalendarioPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [eventsResult, tasksResult, areas] = await Promise.all([
    getCalendarEvents(session.user.id, year, month).catch(() => []),
    getTasksWithDueDateInMonth(session.user.id, year, month).catch(() => []),
    getAreas(session.user.id).catch(() => []),
  ])

  const events = eventsResult
  const tasks = tasksResult

  return <CalendarioClient initialEvents={events} initialTasks={tasks} areas={areas} initialYear={year} initialMonth={month} />
}
