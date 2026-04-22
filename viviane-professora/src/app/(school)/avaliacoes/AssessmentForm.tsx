"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { StudentPicker, type StudentOption } from "@/components/StudentPicker"
import { FormField, FormSection } from "@/components/FormField"
import { RadarChart, RadarLegend } from "@/components/RadarChart"
import { ASSESSMENT_AXES, SCORE_LABEL } from "@/config/assessment-axes"
import { upsertAssessmentAction } from "@/app/actions/assessment.actions"
import type { MonthlyAssessment } from "@/types"

type Scores = Record<string, number>

function currentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-")
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
  const name = months[parseInt(m) - 1]
  return `${name.charAt(0).toUpperCase() + name.slice(1)} ${y}`
}

export function AssessmentForm({
  students,
  initialStudentId,
  initialMonth,
  previous,
  existing,
}: {
  students: StudentOption[]
  initialStudentId?: string
  initialMonth?: string
  previous?: MonthlyAssessment | null
  existing?: MonthlyAssessment
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const [studentId, setStudentId] = useState(existing?.studentId ?? initialStudentId ?? "")
  const [referenceMonth, setReferenceMonth] = useState(
    existing ? `${new Date(existing.referenceMonth).getFullYear()}-${String(new Date(existing.referenceMonth).getMonth() + 1).padStart(2, "0")}` : initialMonth ?? currentYearMonth(),
  )
  const [label, setLabel] = useState(existing?.label ?? "")

  const initialScores = useMemo<Scores>(() => {
    if (existing) return Object.fromEntries(ASSESSMENT_AXES.map((a) => [a.key, (existing as unknown as Record<string, number>)[a.field]]))
    return Object.fromEntries(ASSESSMENT_AXES.map((a) => [a.key, 3]))
  }, [existing])
  const [scores, setScores] = useState<Scores>(initialScores)

  const initialNotes = useMemo<Record<string, string>>(() => {
    const notes: Record<string, string> = {}
    ASSESSMENT_AXES.forEach((a) => {
      notes[a.key] = existing ? (((existing as unknown as Record<string, string | null>)[a.field + "Note"]) ?? "") : ""
    })
    return notes
  }, [existing])
  const [notes, setNotes] = useState(initialNotes)

  const [overallNotes, setOverallNotes] = useState(existing?.overallNotes ?? "")
  const [nextSteps, setNextSteps] = useState(existing?.nextSteps ?? "")

  const previousScores = useMemo<Scores | null>(() => {
    if (!previous) return null
    return Object.fromEntries(ASSESSMENT_AXES.map((a) => [a.key, (previous as unknown as Record<string, number>)[a.field]]))
  }, [previous])

  function setScore(key: string, value: number) {
    setScores((s) => ({ ...s, [key]: value }))
  }
  function setNote(key: string, value: string) {
    setNotes((n) => ({ ...n, [key]: value }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!studentId) { setError("Selecione o aluno."); return }
    startTransition(async () => {
      const payload: Record<string, unknown> = {
        studentId,
        referenceMonth,
        label: label || null,
        overallNotes: overallNotes || null,
        nextSteps: nextSteps || null,
      }
      ASSESSMENT_AXES.forEach((a) => {
        payload[a.field] = scores[a.key]
        payload[a.field + "Note"] = notes[a.key] || null
      })
      const res = await upsertAssessmentAction(payload as Parameters<typeof upsertAssessmentAction>[0])
      if (!res.success) { setError(res.error); return }
      router.push("/avaliacoes")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormSection title="Identificação">
        <FormField label="Aluno" required>
          <StudentPicker students={students} value={studentId} onChange={setStudentId} required />
        </FormField>
        <FormField label="Mês de referência" required>
          <input type="month" className="app-input" value={referenceMonth} onChange={(e) => setReferenceMonth(e.target.value)} required />
        </FormField>
        <FormField label="Rótulo (opcional)" full hint='Ex: "Reunião pedagógica — março 2026"'>
          <input className="app-input" value={label} onChange={(e) => setLabel(e.target.value)} />
        </FormField>
      </FormSection>

      <FormSection title={`Avaliação dos 8 eixos — ${monthLabel(referenceMonth)}`} cols={1}>
        <div className="space-y-3">
          {ASSESSMENT_AXES.map((axis) => (
            <div key={axis.key} className="pb-3 border-b last:border-b-0" style={{ borderColor: "var(--color-app-border-light)" }}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div>
                  <div className="text-sm font-semibold">{axis.emoji} {axis.label}</div>
                  <div className="text-[11px] text-app-muted" style={{ color: "var(--color-app-muted)" }}>
                    {axis.description}
                    {previousScores && previousScores[axis.key] !== scores[axis.key] && (
                      <span className="ml-2 font-semibold" style={{ color: previousScores[axis.key] < scores[axis.key] ? "#059669" : "#DC2626" }}>
                        ({previousScores[axis.key]} → {scores[axis.key]} {previousScores[axis.key] < scores[axis.key] ? "▲" : "▼"})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setScore(axis.key, v)}
                      className="w-8 h-8 rounded-lg text-sm font-bold border transition"
                      style={{
                        background: scores[axis.key] === v ? "var(--color-accent)" : "var(--color-app-surface)",
                        color: scores[axis.key] === v ? "#fff" : "var(--color-app-text)",
                        borderColor: scores[axis.key] === v ? "var(--color-accent)" : "var(--color-app-border)",
                      }}
                      title={SCORE_LABEL[v]}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="app-input text-sm"
                rows={2}
                placeholder={`Notas sobre ${axis.label.toLowerCase()}...`}
                value={notes[axis.key]}
                onChange={(e) => setNote(axis.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </FormSection>

      {/* Preview radar */}
      <FormSection title="Prévia do radar" cols={1}>
        <div className="flex flex-col items-center">
          <RadarChart
            axes={ASSESSMENT_AXES}
            series={[
              ...(previousScores ? [{ label: `Mês anterior`, color: "#9CA3AF", data: previousScores, opacity: 0.15 }] : []),
              { label: monthLabel(referenceMonth), color: "var(--color-accent)", data: scores, opacity: 0.3 },
            ]}
          />
          <RadarLegend
            series={[
              ...(previousScores ? [{ label: "Mês anterior", color: "#9CA3AF", data: previousScores }] : []),
              { label: monthLabel(referenceMonth), color: "#7C3AED", data: scores },
            ]}
          />
        </div>
      </FormSection>

      <FormSection title="Síntese da reunião" cols={1}>
        <FormField label="Observações gerais" full hint="Vai no texto exportado pra ata da reunião.">
          <textarea className="app-input" rows={4} value={overallNotes} onChange={(e) => setOverallNotes(e.target.value)} />
        </FormField>
        <FormField label="Próximos passos" full hint="Ações combinadas com a família / equipe pedagógica.">
          <textarea className="app-input" rows={3} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
        </FormField>
      </FormSection>

      {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" className="app-btn-primary" disabled={pending}>
          {pending ? "Salvando..." : existing ? "Salvar alterações" : "Salvar avaliação"}
        </button>
        <button type="button" className="app-btn-ghost" onClick={() => router.back()}>Cancelar</button>
      </div>
    </form>
  )
}
