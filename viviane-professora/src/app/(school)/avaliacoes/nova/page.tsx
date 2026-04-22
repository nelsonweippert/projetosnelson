import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AssessmentForm } from "../AssessmentForm"

export default async function NovaAvaliacaoPage({ searchParams }: { searchParams: Promise<{ aluno?: string; mes?: string }> }) {
  const sp = await searchParams
  const session = await auth()
  const students = await db.student.findMany({
    where: { userId: session!.user!.id, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, classroom: true },
  })

  // Se houver aluno pré-selecionado, tenta buscar a última avaliação pra mostrar comparativo
  let previous = null
  if (sp.aluno) {
    previous = await db.monthlyAssessment.findFirst({
      where: { userId: session!.user!.id, studentId: sp.aluno },
      orderBy: { referenceMonth: "desc" },
    })
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Nova avaliação mensal</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          Radar com 8 eixos pra reunião. Escala 1 (Insuficiente) a 5 (Excelente).
        </p>
      </header>
      <AssessmentForm students={students} initialStudentId={sp.aluno} initialMonth={sp.mes} previous={previous} />
    </div>
  )
}
