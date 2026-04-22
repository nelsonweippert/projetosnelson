import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatDate, initials } from "@/lib/utils"
import { StudentAISummary } from "./StudentAISummary"
import { RadarChart } from "@/components/RadarChart"
import { ASSESSMENT_AXES } from "@/config/assessment-axes"

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const student = await db.student.findFirst({
    where: { id, userId: session!.user!.id },
    include: {
      observations: { orderBy: { occurredAt: "desc" }, take: 20 },
      reports: { orderBy: { createdAt: "desc" }, take: 5 },
      corrections: { orderBy: { createdAt: "desc" }, take: 5 },
      assessments: { orderBy: { referenceMonth: "desc" }, take: 2 },
    },
  })

  if (!student) notFound()

  const latestAssessment = student.assessments[0]
  const previousAssessment = student.assessments[1]
  const latestScores = latestAssessment
    ? Object.fromEntries(ASSESSMENT_AXES.map((ax) => [ax.key, (latestAssessment as unknown as Record<string, number>)[ax.field]]))
    : null
  const prevScores = previousAssessment
    ? Object.fromEntries(ASSESSMENT_AXES.map((ax) => [ax.key, (previousAssessment as unknown as Record<string, number>)[ax.field]]))
    : null

  return (
    <div className="max-w-5xl">
      <Link href="/alunos" className="text-xs text-app-muted hover:text-app-text" style={{ color: "var(--color-app-muted)" }}>
        ← Alunos
      </Link>

      <header className="mt-3 mb-6 flex items-start gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shrink-0"
          style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-dark)" }}
        >
          {initials(student.fullName)}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{student.fullName}</h1>
          <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
            {student.classroom ?? "sem turma"}
            {student.birthDate && ` · ${formatDate(student.birthDate)}`}
            {student.enrollmentId && ` · matrícula ${student.enrollmentId}`}
          </p>
          {student.specialNeeds && (
            <span className="inline-block mt-2 app-pill" style={{ background: "#FEF3C7", color: "#92400E" }}>
              {student.specialNeeds}
            </span>
          )}
        </div>
        <Link href={`/alunos/${student.id}/editar`} className="app-btn-ghost">Editar</Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <StudentAISummary studentId={student.id} />

          {latestScores ? (
            <div className="app-card">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted" style={{ color: "var(--color-app-muted)" }}>
                  Avaliação mensal — {new Date(latestAssessment.referenceMonth).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </h2>
                <div className="flex gap-2">
                  <Link href={`/avaliacoes/${latestAssessment.id}`} className="text-xs underline hover:text-accent-dark">ver detalhes</Link>
                  <Link href={`/avaliacoes/nova?aluno=${student.id}`} className="text-xs underline hover:text-accent-dark">nova</Link>
                </div>
              </div>
              <div className="flex justify-center">
                <RadarChart
                  axes={ASSESSMENT_AXES}
                  size={320}
                  series={[
                    ...(prevScores ? [{ label: "anterior", color: "#9CA3AF", data: prevScores, opacity: 0.15 }] : []),
                    { label: "atual", color: "#7C3AED", data: latestScores, opacity: 0.3 },
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="app-card text-center py-4">
              <p className="text-sm text-app-muted mb-2" style={{ color: "var(--color-app-muted)" }}>
                Nenhuma avaliação mensal para este aluno ainda.
              </p>
              <Link href={`/avaliacoes/nova?aluno=${student.id}`} className="app-btn-primary inline-block text-sm">
                📊 Fazer primeira avaliação
              </Link>
            </div>
          )}

          <InfoCard title="Perfil pedagógico">
            <InfoRow label="Estilo" value={student.learningStyle ?? "—"} />
            <InfoRow label="Pontos fortes" value={student.strengths ?? "—"} multiline />
            <InfoRow label="Dificuldades" value={student.challenges ?? "—"} multiline />
            <InfoRow label="Obs. médicas" value={student.medicalNotes ?? "—"} multiline />
          </InfoCard>

          <InfoCard title={`Observações recentes (${student.observations.length})`}>
            {student.observations.length === 0 ? (
              <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
                Nenhuma observação registrada ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {student.observations.map((o) => (
                  <li key={o.id} className="text-sm py-2 border-b last:border-b-0" style={{ borderColor: "var(--color-app-border-light)" }}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{o.title}</span>
                      <span className="text-[11px] text-app-muted" style={{ color: "var(--color-app-muted)" }}>
                        {formatDate(o.occurredAt)}
                      </span>
                    </div>
                    <p className="text-xs text-app-muted mt-0.5" style={{ color: "var(--color-app-muted)" }}>{o.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </InfoCard>
        </div>

        <aside className="space-y-4">
          <InfoCard title="Responsáveis">
            {student.guardian1Name && (
              <div className="mb-3">
                <div className="font-semibold text-sm">{student.guardian1Name}</div>
                {student.guardian1Phone && <div className="text-xs text-app-muted" style={{ color: "var(--color-app-muted)" }}>{student.guardian1Phone}</div>}
                {student.guardian1Email && <div className="text-xs text-app-muted" style={{ color: "var(--color-app-muted)" }}>{student.guardian1Email}</div>}
              </div>
            )}
            {student.guardian2Name && (
              <div>
                <div className="font-semibold text-sm">{student.guardian2Name}</div>
                {student.guardian2Phone && <div className="text-xs text-app-muted" style={{ color: "var(--color-app-muted)" }}>{student.guardian2Phone}</div>}
                {student.guardian2Email && <div className="text-xs text-app-muted" style={{ color: "var(--color-app-muted)" }}>{student.guardian2Email}</div>}
              </div>
            )}
            {!student.guardian1Name && !student.guardian2Name && (
              <p className="text-xs text-app-muted" style={{ color: "var(--color-app-muted)" }}>Sem dados de responsáveis.</p>
            )}
          </InfoCard>

          <InfoCard title="Relatórios">
            {student.reports.length === 0 ? (
              <p className="text-xs text-app-muted" style={{ color: "var(--color-app-muted)" }}>Nenhum.</p>
            ) : (
              student.reports.map((r) => (
                <Link key={r.id} href={`/relatorios/${r.id}`} className="block text-sm py-1.5 hover:text-accent">
                  {r.periodLabel ?? r.period} · <span className="text-xs text-app-muted">{formatDate(r.createdAt)}</span>
                </Link>
              ))
            )}
          </InfoCard>
        </aside>
      </div>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="app-card">
      <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>{title}</h2>
      {children}
    </div>
  )
}

function InfoRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={multiline ? "mb-2" : "flex justify-between py-1"}>
      <span className="text-xs text-app-muted" style={{ color: "var(--color-app-muted)" }}>{label}</span>
      <span className={multiline ? "block text-sm mt-0.5" : "text-sm font-medium"}>{value}</span>
    </div>
  )
}
