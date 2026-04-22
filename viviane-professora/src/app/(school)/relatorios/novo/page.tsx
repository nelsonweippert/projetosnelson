import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ReportForm } from "../ReportForm"

export default async function NovoRelatorioPage() {
  const session = await auth()
  const students = await db.student.findMany({
    where: { userId: session!.user!.id, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, classroom: true },
  })

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Novo relatório descritivo</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          A IA vai cruzar todas observações do aluno no período e gerar 10 seções de relatório.
        </p>
      </header>
      <ReportForm students={students} />
    </div>
  )
}
