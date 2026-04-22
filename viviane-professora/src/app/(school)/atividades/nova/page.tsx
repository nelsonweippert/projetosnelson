import { ActivityForm } from "../ActivityForm"

export default function NovaAtividadePage() {
  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Nova atividade</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          A IA gera uma lista estruturada de exercícios — com gabarito, dicas e alinhamento BNCC.
        </p>
      </header>
      <ActivityForm />
    </div>
  )
}
