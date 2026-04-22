import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { TEACHING_SKILLS } from "@/config/teaching-skills"

export default async function HomePage() {
  const session = await auth()
  const userId = session!.user!.id

  const [studentsCount, observationsCount, reportsCount, lessonsCount] = await Promise.all([
    db.student.count({ where: { userId, isActive: true } }),
    db.observation.count({ where: { userId } }),
    db.report.count({ where: { userId } }),
    db.lessonPlan.count({ where: { userId } }),
  ])

  const firstName = session!.user!.name?.split(" ")[0] ?? "Professora"

  return (
    <div className="max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Bom dia, {firstName}</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          O que vamos fazer hoje?
        </p>
      </header>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Alunos ativos" value={studentsCount} />
        <StatCard label="Observações" value={observationsCount} />
        <StatCard label="Relatórios" value={reportsCount} />
        <StatCard label="Planos de aula" value={lessonsCount} />
      </div>

      {/* Skills grid */}
      <h2 className="text-sm font-bold uppercase tracking-wider text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
        Skills
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEACHING_SKILLS.map((skill) => (
          <Link
            key={skill.id}
            href={skill.route}
            className="app-card app-card-clickable block group"
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="text-2xl">{skill.icon}</div>
              <div className="flex-1">
                <h3 className="font-bold text-base group-hover:text-accent-dark" style={{ color: "inherit" }}>
                  {skill.label}
                </h3>
                <p className="text-xs text-app-muted mt-0.5" style={{ color: "var(--color-app-muted)" }}>
                  {skill.tagline}
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-app-text mt-2" style={{ color: "var(--color-app-muted)" }}>
              {skill.description}
            </p>
            {skill.claudeFeatures.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {skill.claudeFeatures.slice(0, 2).map((f) => (
                  <span key={f} className="app-pill">{f}</span>
                ))}
                {skill.claudeFeatures.length > 2 && (
                  <span className="app-pill" style={{ background: "var(--color-app-border-light)", color: "var(--color-app-muted)" }}>
                    +{skill.claudeFeatures.length - 2}
                  </span>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="app-card">
      <div className="text-xs uppercase tracking-wider text-app-muted mb-1" style={{ color: "var(--color-app-muted)" }}>
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}
