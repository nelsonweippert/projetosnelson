import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatDate } from "@/lib/utils"
import { ReportEditor } from "./ReportEditor"

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const report = await db.report.findFirst({
    where: { id, userId: session!.user!.id },
    include: { student: { select: { id: true, fullName: true } } },
  })
  if (!report) notFound()

  return (
    <div className="max-w-4xl">
      <Link href="/relatorios" className="text-xs text-app-muted hover:text-app-text" style={{ color: "var(--color-app-muted)" }}>
        ← Relatórios
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="text-2xl font-bold">Relatório — {report.student.fullName}</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          {report.periodLabel ?? report.period} · status: {report.status} · criado em {formatDate(report.createdAt)}
          {report.generatedBy && ` · ${report.generatedBy === "ai" ? "gerado por IA" : report.generatedBy === "ai_edited" ? "IA + edição" : "manual"}`}
        </p>
      </header>

      <ReportEditor report={report} />
    </div>
  )
}
