import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { CorrectionForm } from "../CorrectionForm"

export default async function NovaCorrecaoPage() {
  const session = await auth()
  const students = await db.student.findMany({
    where: { userId: session!.user!.id, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, classroom: true },
  })

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Nova correção</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          Tire foto do caderno — a IA analisa (Vision), transcreve e sugere correção estruturada.
        </p>
      </header>
      <CorrectionForm students={students} />
    </div>
  )
}
