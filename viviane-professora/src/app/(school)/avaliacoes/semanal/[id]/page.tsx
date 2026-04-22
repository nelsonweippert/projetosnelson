import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { RadarChart, RadarLegend } from "@/components/RadarChart"
import { ASSESSMENT_AXES, SCORE_COLOR, SCORE_LABEL } from "@/config/assessment-axes"
import { WeeklyActions } from "./WeeklyActions"

function weekLabel(d: Date) {
  const sun = new Date(d); sun.setDate(sun.getDate() + 6)
  const f = (x: Date) => `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}`
  return `${f(d)} a ${f(sun)}`
}

export default async function WeeklyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user!.id

  const w = await db.weeklyAssessment.findFirst({
    where: { id, userId },
    include: { student: { select: { id: true, fullName: true, classroom: true } } },
  })
  if (!w) notFound()

  const previous = await db.weeklyAssessment.findFirst({
    where: { userId, studentId: w.studentId, referenceWeek: { lt: w.referenceWeek } },
    orderBy: { referenceWeek: "desc" },
  })

  const scores = Object.fromEntries(ASSESSMENT_AXES.map((ax) => [ax.key, (w as unknown as Record<string, number>)[ax.field]])) as Record<string, number>
  const prevScores = previous
    ? Object.fromEntries(ASSESSMENT_AXES.map((ax) => [ax.key, (previous as unknown as Record<string, number>)[ax.field]])) as Record<string, number>
    : null

  const avg = ASSESSMENT_AXES.reduce((s, ax) => s + scores[ax.key], 0) / ASSESSMENT_AXES.length

  return (
    <div className="max-w-5xl">
      <Link href="/avaliacoes" className="text-xs text-app-muted hover:text-app-text" style={{ color: "var(--color-app-muted)" }}>
        ← Avaliações
      </Link>

      <header className="mt-3 mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{w.student.fullName}</h1>
          <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
            Semana de {weekLabel(w.referenceWeek)}
            {w.student.classroom && ` · ${w.student.classroom}`}
            {w.label && ` · ${w.label}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/avaliacoes/semanal/${w.id}/editar`} className="app-btn-ghost">Editar</Link>
          <WeeklyActions id={w.id} />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="app-card flex flex-col items-center">
          <RadarChart
            axes={ASSESSMENT_AXES}
            size={320}
            series={[
              ...(prevScores ? [{ label: "semana anterior", color: "#9CA3AF", data: prevScores, opacity: 0.15 }] : []),
              { label: "esta semana", color: "#7C3AED", data: scores, opacity: 0.3 },
            ]}
          />
          <RadarLegend
            series={[
              ...(prevScores ? [{ label: "anterior", color: "#9CA3AF", data: prevScores }] : []),
              { label: "esta semana", color: "#7C3AED", data: scores },
            ]}
          />
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
                    <span className="text-[11px] text-app-muted" style={{ color: "var(--color-app-muted)" }}>{SCORE_LABEL[score]}</span>
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

      {(w.highlight || w.concerns) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {w.highlight && (
            <div className="app-card">
              <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2" style={{ color: "var(--color-app-muted)" }}>
                ✨ Destaque da semana
              </h2>
              <p className="text-sm whitespace-pre-wrap">{w.highlight}</p>
            </div>
          )}
          {w.concerns && (
            <div className="app-card">
              <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2" style={{ color: "var(--color-app-muted)" }}>
                ⚠️ Preocupação
              </h2>
              <p className="text-sm whitespace-pre-wrap">{w.concerns}</p>
            </div>
          )}
        </div>
      )}

      {ASSESSMENT_AXES.some((ax) => (w as unknown as Record<string, string | null>)[ax.field + "Note"]) && (
        <div className="app-card">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
            Notas por eixo
          </h2>
          <div className="space-y-2">
            {ASSESSMENT_AXES.map((ax) => {
              const note = (w as unknown as Record<string, string | null>)[ax.field + "Note"]
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
    </div>
  )
}
