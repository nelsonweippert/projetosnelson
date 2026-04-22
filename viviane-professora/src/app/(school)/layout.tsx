import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="app-layout">
      <Sidebar userName={session.user.name ?? undefined} />
      <main className="ml-64 min-h-screen p-8">{children}</main>
    </div>
  )
}
