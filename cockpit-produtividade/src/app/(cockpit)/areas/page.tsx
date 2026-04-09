import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAreas } from "@/services/area.service"
import { AreasClient } from "./AreasClient"

export default async function AreasPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const areas = await getAreas(session.user.id).catch(() => [])
  return <AreasClient initialAreas={areas} />
}
