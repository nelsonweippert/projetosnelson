import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getContacts, getContactStats } from "@/services/contact.service"
import { getAreas } from "@/services/area.service"
import { ContatosClient } from "./ContatosClient"

export default async function ContatosPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [contacts, stats, areas] = await Promise.all([
    getContacts(session.user.id).catch(() => []),
    getContactStats(session.user.id).catch(() => ({
      total: 0,
      neverContacted: 0,
      staleOver14d: 0,
      staleOver30d: 0,
      needsFollowUp: 0,
    })),
    getAreas(session.user.id).catch(() => []),
  ])

  return (
    <ContatosClient
      initialContacts={contacts}
      initialStats={stats}
      areas={areas}
    />
  )
}
