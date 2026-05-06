import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getNotes, getNoteStats } from "@/services/note.service"
import { getAreas } from "@/services/area.service"
import { NotasClient } from "./NotasClient"

export default async function NotasPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [notes, stats, areas] = await Promise.all([
    getNotes(session.user.id).catch(() => []),
    getNoteStats(session.user.id).catch(() => ({
      total: 0,
      last7d: 0,
      byType: { free: 0, journal: 0, meeting: 0, idea: 0, referenceSummary: 0 },
    })),
    getAreas(session.user.id).catch(() => []),
  ])

  return <NotasClient initialNotes={notes} initialStats={stats} areas={areas} />
}
