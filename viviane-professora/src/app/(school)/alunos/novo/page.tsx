import { StudentForm } from "../StudentForm"

export default function NewStudentPage() {
  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Novo aluno</h1>
        <p className="text-sm text-app-muted" style={{ color: "var(--color-app-muted)" }}>
          Preencha os dados básicos agora; o resto pode ser completado depois.
        </p>
      </header>
      <StudentForm />
    </div>
  )
}
