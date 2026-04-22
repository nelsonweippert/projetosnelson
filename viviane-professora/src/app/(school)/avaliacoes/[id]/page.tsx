import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { RadarChart, RadarLegend } from "@/components/RadarChart"
import { ASSESSMENT_AXES, SCORE_LABEL, SCORE_COLOR } from "@/config/assessment-axes"
import { AssessmentActions } from "./AssessmentActions"

function monthLabel(d: Date) {
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
  return `${months[d.getMonth()].charAt(0).toUpperCase()}${months[d.getMonth()].slice(1)} ${d.getFullYear()}`
}

export default async function AssessmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user!.id

  const a = await db.monthlyAssessment.findFirst({
    where: { id, userId },
    include: { student: { select: { id: true, fullName: true, classroom: true } } },
  })
  if (!a) notFound()

  // Mês anterior (se houver)
  const previous = await db.monthlyAssessment.findFirst({
    where: { userId, studentId: a.studentId, referenceMonth: { lt: a.referenceMonth } },
    orderBy: { referenceMonth: "desc" },
  })

  const scores = Object.fromEntries(ASSESSMENT_AXES.map((ax) => [ax.key, (a as unknown as Record<string, number>)[ax.field]])) as Record<string, number>
  const prevScores = previous
    ? Object.fromEntries(ASSESSMENT_AXES.map((ax) => [ax.key, (previous as unknown as Record<string, number>)[ax.field]])) as Record<string, number>
    : null

  // Texto pra ata
  const reportText = [
    `AVALIAÇÃO MENSAL — ${a.student.fullName}`,
    `Mês: ${monthLabel(a.referenceMonth)}${a.label ? ` · ${a.label}` : ""}`,
    "",
    "EIXOS AVALIADOS:",
    ...ASSESSMENT_AXES.map((ax) => {
      const score = scores[ax.key]
      const note = (a as unknown as Record<string, string | null>)[ax.field + "Note"]
      return `- ${ax.label}: ${score}/5 (${SCORE_LABEL[score]})${note ? ` — ${note}` : ""}`
    }),
    "",
    a.overallNotes ? `OBSERVAÇÕES GERAIS:\n${a.overallNotes}` : "",
    a.nextSteps ? `\nPRÓXIMOS PASSOS:\n${a.nextSteps}` : "",
  ].filter(Boolean).join("\n")

  const avg = ASSESSMENT_AXES.reduce((sum, ax) => sum + scores[ax.key], 0) / ASSESSMENT_AXES.length

  return (
    <div className="max-w-5xl">
      <Link href="/avaliacoes" className="text-xs text-app-muted hover:text-app-text" style={{ color: "var(--color-app-muted)" }}>
        ← Avaliações
      </Link>

      <header className="mt-3 mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{a.student.fullName}</h1>
          <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
            {monthLabel(a.referenceMonth)}
            {a.student.classroom && ` · ${a.student.classroom}`}
            {a.label && ` · ${a.label}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/avaliacoes/${a.id}/editar`} className="app-btn-ghost">Editar</Link>
          <AssessmentActions id={a.id} />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="app-card flex flex-col items-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
            Radar dos 8 eixos
          </h2>
          <RadarChart
            axes={ASSESSMENT_AXES}
            series={[
              ...(prevScores ? [{ label: "Mês anterior", color: "#9CA3AF", data: prevScores, opacity: 0.15 }] : []),
              { label: monthLabel(a.referenceMonth), color: "#7C3AED", data: scores, opacity: 0.3 },
            ]}
          />
          <div className="mt-2">
            <RadarLegend
              series={[
                ...(prevScores ? [{ label: "Mês anterior", color: "#9CA3AF", data: prevScores }] : []),
                { label: monthLabel(a.referenceMonth), color: "#7C3AED", data: scores },
              ]}
            />
          </div>
        </div>

        <div className="app-card">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
            Scores por eixo
          </h2>
          <div className="space-y-2">
            {ASSESSMENT_AXES.map((ax) => {
              const score = scores[ax.key]
              const diff = prevScores ? score - prevScores[ax.key] : 0
              return (
                <div key={ax.key} className="flex items-center justify-between text-sm py-1">
                  <span>{ax.emoji} {ax.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold w-5 text-center" style={{ color: SCORE_COLOR[score] }}>{score}</span>
                    {diff !== 0 && (
                      <span className="text-[11px] font-semibold" style={{ color: diff > 0 ? "#059669" : "#DC2626" }}>
                        {diff > 0 ? "▲" : "▼"}{Math.abs(diff)}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t flex justify-between font-bold text-sm" style={{ borderColor: "var(--color-app-border-light)" }}>
            <span>Média</span>
            <span>{avg.toFixed(1)} / 5</span>
          </div>
        </div>
      </div>

      {ASSESSMENT_AXES.some((ax) => (a as unknown as Record<string, string | null>)[ax.field + "Note"]) && (
        <div className="app-card mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
            Notas por eixo
          </h2>
          <div className="space-y-2">
            {ASSESSMENT_AXES.map((ax) => {
              const note = (a as unknown as Record<string, string | null>)[ax.field + "Note"]
              if (!note) return null
              return (
                <div key={ax.key}>
                  <div className="text-xs font-semibold">{ax.emoji} {ax.label}</div>
                  <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>{note}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {a.overallNotes && (
        <div className="app-card mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2" style={{ color: "var(--color-app-muted)" }}>
            Observações gerais
          </h2>
          <p className="text-sm whitespace-pre-wrap">{a.overallNotes}</p>
        </div>
      )}

      {a.nextSteps && (
        <div className="app-card mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2" style={{ color: "var(--color-app-muted)" }}>
            Próximos passos
          </h2>
          <p className="text-sm whitespace-pre-wrap">{a.nextSteps}</p>
        </div>
      )}

      <div className="app-card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted" style={{ color: "var(--color-app-muted)" }}>
            Texto pronto pra ata
          </h2>
          <CopyButton text={reportText} />
        </div>
        <pre className="text-xs whitespace-pre-wrap font-[family-name:var(--font-outfit)] bg-[color:var(--color-app-bg)] p-3 rounded-lg">{reportText}</pre>
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="app-btn-ghost text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
      }}
      data-clipboard={text}
    >
      📋 Copiar
    </button>
  )
}
