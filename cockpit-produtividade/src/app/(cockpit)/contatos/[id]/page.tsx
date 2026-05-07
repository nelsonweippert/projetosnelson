import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getContactById } from "@/services/contact.service"
import { getAreas } from "@/services/area.service"
import { ContactDetailClient } from "./ContactDetailClient"

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await params

  const [contact, areas] = await Promise.all([
    getContactById(id, session.user.id),
    getAreas(session.user.id).catch(() => []),
  ])

  if (!contact) notFound()

  return <ContactDetailClient contact={contact} areas={areas} />
}
