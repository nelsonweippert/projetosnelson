import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getStudies, getStudyStats } from "@/services/study.service"
import { getAreas } from "@/services/area.service"
import { ProjetosClient } from "./ProjetosClient"

export default async function ProjetosPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [studies, stats, areas] = await Promise.all([
    getStudies(session.user.id).catch(() => []),
    getStudyStats(session.user.id).catch(() => ({
      total: 0, notStarted: 0, inProgress: 0, completed: 0, paused: 0,
      totalDoneHours: 0, totalPlannedHours: 0,
      hoursLast7d: 0, hoursLast30d: 0, sessionsLast7d: 0,
    })),
    getAreas(session.user.id).catch(() => []),
  ])

  return <ProjetosClient initialStudies={studies} initialStats={stats} areas={areas} />
}
