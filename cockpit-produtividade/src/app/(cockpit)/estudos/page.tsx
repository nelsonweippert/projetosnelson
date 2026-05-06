import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Target, ChevronRight } from "lucide-react"
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

  return (
    <>
      <div className="max-w-4xl mx-auto mb-4">
        <Link
          href="/estudos/projetos"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-accent/5 hover:bg-accent/10 border border-accent/20 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
              <Target size={16} className="text-accent" />
            </div>
            <div>
              <div className="text-sm font-semibold text-cockpit-text">Projetos de Estudo</div>
              <div className="text-xs text-cockpit-muted">Cursos, livros e áreas com tracking de horas</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-cockpit-muted group-hover:text-accent transition-colors" />
        </Link>
      </div>
      <EstudosClient initialRefs={refs} areas={areas} />
    </>
  )
}
