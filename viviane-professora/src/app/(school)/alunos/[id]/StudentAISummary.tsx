"use client"

import { useState, useTransition } from "react"
import { summarizeStudentAction } from "@/app/actions/student.actions"

export function StudentAISummary({ studentId }: { studentId: string }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function generate() {
    setError("")
    startTransition(async () => {
      const res = await summarizeStudentAction(studentId)
      if (!res.success) setError(res.error)
      else setSummary(res.data)
    })
  }

  return (
    <div className="app-card" style={{ background: "linear-gradient(135deg, var(--color-accent-soft) 0%, #FFFFFF 60%)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">✨</span>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-accent-dark)" }}>
          Síntese pedagógica (IA)
        </h2>
      </div>

      {summary ? (
        <>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
          <button onClick={generate} disabled={pending} className="mt-3 text-xs underline text-app-muted hover:text-app-text" style={{ color: "var(--color-app-muted)" }}>
            {pending ? "Atualizando..." : "Atualizar síntese"}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-app-muted mb-3" style={{ color: "var(--color-app-muted)" }}>
            Gere uma síntese automática do perfil + observações recentes.
            Usa Claude Opus 4.7 com adaptive thinking.
          </p>
          <button onClick={generate} disabled={pending} className="app-btn-primary text-xs">
            {pending ? "Gerando..." : "Gerar síntese"}
          </button>
        </>
      )}
      {error && <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>}
    </div>
  )
}
