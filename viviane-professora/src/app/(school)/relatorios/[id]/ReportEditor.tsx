"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateReportAction, deleteReportAction } from "@/app/actions/report.actions"
import type { Report } from "@/types"

const SECTIONS = [
  { key: "socioEmotional", label: "Desenvolvimento sócio-emocional" },
  { key: "academic", label: "Aproveitamento acadêmico" },
  { key: "language", label: "Língua Portuguesa" },
  { key: "math", label: "Matemática" },
  { key: "science", label: "Ciências da Natureza" },
  { key: "socialStudies", label: "História e Geografia" },
  { key: "arts", label: "Artes" },
  { key: "physicalEd", label: "Educação Física" },
  { key: "participation", label: "Participação e autonomia" },
  { key: "conclusion", label: "Conclusão e recomendações" },
] as const

export function ReportEditor({ report }: { report: Report }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [error, setError] = useState("")
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const [sections, setSections] = useState<Record<string, string>>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.key, (report[s.key as keyof Report] as string | null) ?? ""])),
  )

  function save(newStatus?: "DRAFT" | "REVIEWED" | "FINAL") {
    setError("")
    startTransition(async () => {
      const res = await updateReportAction({ id: report.id, ...sections, status: newStatus })
      if (!res.success) { setError(res.error); return }
      setSavedAt(new Date())
      if (newStatus === "FINAL") router.push("/relatorios")
      else router.refresh()
    })
  }

  function remove() {
    if (!confirm("Excluir este relatório? Essa ação não pode ser desfeita.")) return
    startDelete(async () => {
      const res = await deleteReportAction(report.id)
      if (!res.success) { setError(res.error); return }
      router.push("/relatorios")
    })
  }

  return (
    <div className="space-y-3">
      {SECTIONS.map((s) => (
        <div key={s.key} className="app-card">
          <label className="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2" style={{ color: "var(--color-app-muted)" }}>
            {s.label}
          </label>
          <textarea
            className="app-input"
            rows={4}
            value={sections[s.key]}
            onChange={(e) => setSections((prev) => ({ ...prev, [s.key]: e.target.value }))}
          />
        </div>
      ))}

      {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
      {savedAt && <div className="text-xs text-green-700">✓ Salvo {savedAt.toLocaleTimeString("pt-BR")}</div>}

      <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: "var(--color-app-border)" }}>
        <button onClick={() => save("DRAFT")} className="app-btn-ghost" disabled={pending}>
          {pending ? "Salvando..." : "Salvar rascunho"}
        </button>
        <button onClick={() => save("REVIEWED")} className="app-btn-ghost" disabled={pending}>
          Marcar como revisado
        </button>
        <button onClick={() => save("FINAL")} className="app-btn-primary" disabled={pending}>
          ✓ Finalizar
        </button>
        <button onClick={remove} className="ml-auto text-xs text-red-600 hover:underline" disabled={deleting}>
          {deleting ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </div>
  )
}
