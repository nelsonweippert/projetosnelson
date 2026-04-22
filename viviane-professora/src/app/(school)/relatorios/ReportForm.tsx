"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { StudentPicker, type StudentOption } from "@/components/StudentPicker"
import { FormField, FormSection } from "@/components/FormField"
import { generateReportAction } from "@/app/actions/report.actions"

const PERIODS = [
  { value: "BIMESTER_1", label: "1º Bimestre" },
  { value: "BIMESTER_2", label: "2º Bimestre" },
  { value: "BIMESTER_3", label: "3º Bimestre" },
  { value: "BIMESTER_4", label: "4º Bimestre" },
  { value: "SEMESTER_1", label: "1º Semestre" },
  { value: "SEMESTER_2", label: "2º Semestre" },
  { value: "ANNUAL", label: "Anual" },
  { value: "CUSTOM", label: "Personalizado" },
]

export function ReportForm({ students }: { students: StudentOption[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    studentId: "",
    period: "BIMESTER_2" as "BIMESTER_1" | "BIMESTER_2" | "BIMESTER_3" | "BIMESTER_4" | "SEMESTER_1" | "SEMESTER_2" | "ANNUAL" | "CUSTOM",
    periodLabel: `2º bim ${new Date().getFullYear()}`,
    fromDate: "",
    toDate: "",
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const res = await generateReportAction(form)
      if (!res.success) { setError(res.error); return }
      const report = res.data as { id: string }
      router.push(`/relatorios/${report.id}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormSection title="Configurar relatório">
        <FormField label="Aluno" required>
          <StudentPicker students={students} value={form.studentId} onChange={(id) => setForm((f) => ({ ...f, studentId: id }))} required />
        </FormField>
        <FormField label="Período" required>
          <select className="app-input" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value as typeof form.period }))}>
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </FormField>
        <FormField label="Rótulo do período" required full hint="Aparece no título do relatório. Ex: '2º bim 2026'.">
          <input className="app-input" value={form.periodLabel} onChange={(e) => setForm((f) => ({ ...f, periodLabel: e.target.value }))} required />
        </FormField>
        {form.period === "CUSTOM" && (
          <>
            <FormField label="De" required>
              <input type="date" className="app-input" value={form.fromDate} onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))} required />
            </FormField>
            <FormField label="Até" required>
              <input type="date" className="app-input" value={form.toDate} onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))} required />
            </FormField>
          </>
        )}
      </FormSection>

      {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" className="app-btn-primary" disabled={pending}>
          {pending ? "Gerando (pode levar 1-2 min)..." : "✨ Gerar relatório com IA"}
        </button>
        <button type="button" className="app-btn-ghost" onClick={() => router.back()}>Cancelar</button>
      </div>

      <p className="text-xs text-app-muted mt-3" style={{ color: "var(--color-app-muted)" }}>
        A IA usa Opus 4.7 com adaptive thinking. Cruza todas observações do período + perfil do aluno.
      </p>
    </form>
  )
}
