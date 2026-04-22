import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ObservationForm } from "../ObservationForm"

export default async function NovaObservacaoPage({ searchParams }: { searchParams: Promise<{ aluno?: string }> }) {
  const sp = await searchParams
  const session = await auth()
  const students = await db.student.findMany({
    where: { userId: session!.user!.id, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, classroom: true },
  })

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Nova observação</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          Anotação rápida — a IA vai sugerir tags e resumo ao salvar.
        </p>
      </header>
      <ObservationForm students={students} initialStudentId={sp.aluno} />
    </div>
  )
}
