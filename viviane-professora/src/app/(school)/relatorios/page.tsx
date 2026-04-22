import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { SkillHeader } from "@/components/SkillHeader"
import { formatDate } from "@/lib/utils"

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: "#FEF3C7", color: "#92400E" },
  REVIEWED: { bg: "#DBEAFE", color: "#1E40AF" },
  FINAL: { bg: "#D1FAE5", color: "#065F46" },
}

export default async function RelatoriosPage() {
  const session = await auth()
  const reports = await db.report.findMany({
    where: { userId: session!.user!.id },
    include: { student: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  return (
    <div className="max-w-5xl">
      <SkillHeader
        skillId="REPORTS"
        right={<Link href="/relatorios/novo" className="app-btn-primary">+ Novo relatório</Link>}
      />

      {reports.length === 0 ? (
        <div className="app-card text-center py-10">
          <div className="text-4xl mb-2">📝</div>
          <h2 className="text-lg font-bold mb-1">Nenhum relatório ainda</h2>
          <p className="text-sm text-app-muted mb-4" style={{ color: "var(--color-app-muted)" }}>
            Colete observações e gere relatórios descritivos estruturados em 1 clique.
          </p>
          <Link href="/relatorios/novo" className="app-btn-primary inline-block">Gerar primeiro</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <Link href={`/relatorios/${r.id}`} className="app-card app-card-clickable block">
                <div className="flex justify-between items-baseline gap-2">
                  <div>
                    <strong>{r.student.fullName}</strong>
                    <span className="mx-1.5 text-app-muted" style={{ color: "var(--color-app-muted)" }}>·</span>
                    <span>{r.periodLabel ?? r.period}</span>
                  </div>
                  <span className="app-pill" style={STATUS_COLOR[r.status] ?? {}}>
                    {r.status}
                  </span>
                </div>
                <div className="text-xs text-app-muted mt-1" style={{ color: "var(--color-app-muted)" }}>
                  {formatDate(r.createdAt)} · {r.sourcedFromObsIds?.length ?? 0} observações fonte
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
