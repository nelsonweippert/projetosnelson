import { LessonPlanForm } from "../LessonPlanForm"

export default function NovoPlanoPage() {
  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Novo plano de aula</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          IA pesquisa a BNCC (web_search + web_fetch) e monta o plano estruturado com citações.
        </p>
      </header>
      <LessonPlanForm />
    </div>
  )
}
