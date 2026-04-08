import { auth } from "@/lib/auth"
import { getReferences } from "@/services/reference.service"
import { getAreas } from "@/services/area.service"
import { EstudosClient } from "./EstudosClient"

export default async function EstudosPage() {
  const session = await auth()
  const userId = session?.user?.id!
  const [refs, areas] = await Promise.all([getReferences(userId), getAreas(userId)])
  return <EstudosClient initialRefs={refs} areas={areas} />
}
