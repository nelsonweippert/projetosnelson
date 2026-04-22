import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { SkillHeader } from "@/components/SkillHeader"
import { ASSESSMENT_AXES } from "@/config/assessment-axes"
import { GenerateMonthlyButton } from "./GenerateMonthlyButton"

function monthLabel(d: Date) {
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
  return `${months[d.getMonth()].charAt(0).toUpperCase()}${months[d.getMonth()].slice(1)} ${d.getFullYear()}`
}
function weekLabel(d: Date) {
  const sun = new Date(d); sun.setDate(sun.getDate() + 6)
  const f = (x: Date) => `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}`
  return `${f(d)}–${f(sun)}`
}

const BAR_COLORS = ["#DC2626", "#F59E0B", "#9CA3AF", "#3B82F6", "#10B981"]

export default async function AvaliacoesPage() {
  const session = await auth()
  const userId = session!.user!.id

  const [weeklies, monthlies, students] = await Promise.all([
    db.weeklyAssessment.findMany({
      where: { userId },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: [{ referenceWeek: "desc" }, { createdAt: "desc" }],
      take: 60,
    }),
    db.monthlyAssessment.findMany({
      where: { userId },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: [{ referenceMonth: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
    db.student.findMany({
      where: { userId, isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ])

  // Agrupar semanais por (aluno, mês) pra saber onde dá pra consolidar
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  const weeklyByStudentMonth: Record<string, number> = {}
  weeklies.forEach((w) => {
    const k = `${w.studentId}:${monthKey(w.referenceWeek)}`
    weeklyByStudentMonth[k] = (weeklyByStudentMonth[k] ?? 0) + 1
  })
  const consolidationCandidates = Object.entries(weeklyByStudentMonth)
    .map(([k, count]) => {
      const [studentId, ym] = k.split(":")
      const student = students.find((s) => s.id === studentId)
      return { studentId, referenceMonth: ym, count, studentName: student?.fullName ?? "" }
    })
    .filter((c) => c.studentName)
    .sort((a, b) => b.referenceMonth.localeCompare(a.referenceMonth) || a.studentName.localeCompare(b.studentName))

  return (
    <div className="max-w-5xl">
      <SkillHeader
        skillId="ASSESSMENTS"
        right={
          <Link href="/avaliacoes/semanal/nova" className="app-btn-primary">+ Avaliação semanal</Link>
        }
      />

      {/* Consolidações disponíveis — painel de destaque */}
      {consolidationCandidates.length > 0 && (
        <div className="app-card mb-6" style={{ background: "linear-gradient(135deg, var(--color-accent-soft) 0%, #FFFFFF 60%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🧠</span>
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-accent-dark)" }}>
              Pronto pra consolidar — IA gera mensal cruzando semanais + observações
            </h2>
          </div>
          <ul className="space-y-2">
            {consolidationCandidates.map((c) => {
              const [y, m] = c.referenceMonth.split("-").map((n) => parseInt(n, 10))
              const label = monthLabel(new Date(y, m - 1, 1))
              return (
                <li key={c.studentId + c.referenceMonth} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <strong>{c.studentName}</strong>
                    <span className="mx-1.5 text-app-muted" style={{ color: "var(--color-app-muted)" }}>·</span>
                    <span>{label}</span>
                    <span className="text-xs text-app-muted ml-2" style={{ color: "var(--color-app-muted)" }}>
                      ({c.count} semanais registradas)
                    </span>
                  </div>
                  <GenerateMonthlyButton studentId={c.studentId} referenceMonth={c.referenceMonth} />
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Mensais consolidadas */}
      {monthlies.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
            Consolidações mensais ({monthlies.length})
          </h2>
          <ul className="space-y-2">
            {monthlies.map((a) => {
              const avg = ASSESSMENT_AXES.reduce((s, ax) => s + (a as unknown as Record<string, number>)[ax.field], 0) / ASSESSMENT_AXES.length
              return (
                <li key={a.id}>
                  <Link href={`/avaliacoes/${a.id}`} className="app-card app-card-clickable block">
                    <div className="flex justify-between items-baseline gap-2 mb-1">
                      <div>
                        <strong>{a.student.fullName}</strong>
                        <span className="mx-1.5 text-app-muted" style={{ color: "var(--color-app-muted)" }}>·</span>
                        <span>{monthLabel(a.referenceMonth)}</span>
                        {a.generatedBy === "ai" && <span className="app-pill ml-2">✨ IA</span>}
                        {a.generatedBy === "ai_edited" && <span className="app-pill ml-2">✨ IA + edit</span>}
                      </div>
                      <span className="text-sm font-bold">{avg.toFixed(1)} / 5</span>
                    </div>
                    <div className="flex gap-0.5">
                      {ASSESSMENT_AXES.map((ax) => {
                        const v = (a as unknown as Record<string, number>)[ax.field]
                        return (
                          <span key={ax.key} title={`${ax.label}: ${v}/5`} className="flex-1 h-4 rounded text-[9px] font-bold flex items-center justify-center text-white" style={{ background: BAR_COLORS[v - 1] }}>
                            {ax.emoji}
                          </span>
                        )
                      })}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Semanais */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
          Avaliações semanais ({weeklies.length})
        </h2>
        {weeklies.length === 0 ? (
          <div className="app-card text-center py-10">
            <div className="text-4xl mb-2">📊</div>
            <h3 className="text-lg font-bold mb-1">Nenhuma avaliação semanal ainda</h3>
            <p className="text-sm text-app-muted mb-4" style={{ color: "var(--color-app-muted)" }}>
              Faça avaliações toda sexta-feira (2-3 min por aluno) → no fim do mês a IA consolida pra reunião.
            </p>
            <Link href="/avaliacoes/semanal/nova" className="app-btn-primary inline-block">Primeira semanal</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {weeklies.map((w) => {
              const avg = ASSESSMENT_AXES.reduce((s, ax) => s + (w as unknown as Record<string, number>)[ax.field], 0) / ASSESSMENT_AXES.length
              return (
                <li key={w.id}>
                  <Link href={`/avaliacoes/semanal/${w.id}`} className="app-card app-card-clickable block">
                    <div className="flex justify-between items-baseline gap-2 mb-1">
                      <div>
                        <strong>{w.student.fullName}</strong>
                        <span className="mx-1.5 text-app-muted" style={{ color: "var(--color-app-muted)" }}>·</span>
                        <span className="text-sm">Semana {weekLabel(w.referenceWeek)}</span>
                      </div>
                      <span className="text-sm font-bold">{avg.toFixed(1)}</span>
                    </div>
                    <div className="flex gap-0.5">
                      {ASSESSMENT_AXES.map((ax) => {
                        const v = (w as unknown as Record<string, number>)[ax.field]
                        return (
                          <span key={ax.key} title={`${ax.label}: ${v}/5`} className="flex-1 h-3 rounded text-[8px] font-bold flex items-center justify-center text-white" style={{ background: BAR_COLORS[v - 1] }}>
                            {ax.emoji}
                          </span>
                        )
                      })}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
