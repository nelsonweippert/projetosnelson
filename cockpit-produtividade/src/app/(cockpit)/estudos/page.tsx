import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getReferences } from "@/services/reference.service"
import { getAreas } from "@/services/area.service"
import { EstudosClient } from "./EstudosClient"

export default async function EstudosPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [refs, areas] = await Promise.all([
    getReferences(session.user.id).catch(() => []),
    getAreas(session.user.id).catch(() => []),
  ])

  return <EstudosClient initialRefs={refs} areas={areas} />
}
