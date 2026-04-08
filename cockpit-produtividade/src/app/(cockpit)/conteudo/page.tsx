import { auth } from "@/lib/auth"
import { getContents } from "@/services/content.service"
import { getAreas } from "@/services/area.service"
import { ConteudoClient } from "./ConteudoClient"

export default async function ConteudoPage() {
  const session = await auth()
  const userId = session?.user?.id!
  const [contents, areas] = await Promise.all([getContents(userId), getAreas(userId)])
  return <ConteudoClient initialContents={contents} areas={areas} />
}
