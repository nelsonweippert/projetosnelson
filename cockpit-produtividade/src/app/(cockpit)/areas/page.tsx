import { auth } from "@/lib/auth"
import { getAreas } from "@/services/area.service"
import { AreasClient } from "./AreasClient"

export default async function AreasPage() {
  const session = await auth()
  const areas = await getAreas(session?.user?.id!)
  return <AreasClient initialAreas={areas} />
}
