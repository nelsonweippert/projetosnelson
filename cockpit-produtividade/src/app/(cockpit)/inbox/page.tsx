import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getInboxItems } from "@/services/inbox.service"
import { InboxClient } from "./InboxClient"

export default async function InboxPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const inbox = await getInboxItems(session.user.id)

  return <InboxClient initial={inbox} />
}
