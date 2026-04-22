"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { StudentPicker, type StudentOption } from "@/components/StudentPicker"
import { FormField, FormSection } from "@/components/FormField"
import { analyzeCorrectionAction, saveCorrectionAction } from "@/app/actions/correction.actions"

interface AIResult {
  transcript: string
  correction: {
    grade: string
    feedback: string
    strengths: string
    improvements: string
    bnccAlignment: string[]
  }
}

const MIME_MAP: Record<string, "image/png" | "image/jpeg" | "image/webp" | "image/gif"> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
}

export function CorrectionForm({ students }: { students: StudentOption[] }) {
  const router = useRouter()
  const [analyzing, startAnalyze] = useTransition()
  const [saving, startSave] = useTransition()
  const [error, setError] = useState("")
  const [ai, setAi] = useState<AIResult | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    studentId: "",
    title: "",
    subject: "Língua Portuguesa",
    activityType: "",
    rubric: "",
    imageBase64: "",
    imageMime: "image/jpeg" as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
  })

  // Editable review fields
  const [review, setReview] = useState({ grade: "", feedback: "", strengths: "", improvements: "" })

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm((f) => ({ ...f, [k]: v })) }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError("Imagem > 5MB. Reduza e tente de novo."); return }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    const mime = MIME_MAP[ext]
    if (!mime) { setError("Formato inválido. Use PNG, JPG, WebP ou GIF."); return }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(",")[1]
      setForm((f) => ({ ...f, imageBase64: base64, imageMime: mime }))
      setPreview(dataUrl)
      setError("")
    }
    reader.readAsDataURL(file)
  }

  function analyze() {
    setError(""); setAi(null)
    if (!form.imageBase64) { setError("Anexe uma imagem primeiro."); return }
    if (!form.studentId || !form.title || !form.subject) { setError("Preencha aluno, título e matéria."); return }

    startAnalyze(async () => {
      const res = await analyzeCorrectionAction({
        studentId: form.studentId,
        title: form.title,
        subject: form.subject,
        activityType: form.activityType || undefined,
        rubric: form.rubric || undefined,
        imageBase64: form.imageBase64,
        imageMime: form.imageMime,
      })
      if (!res.success) { setError(res.error); return }
      const result = res.data as AIResult
      setAi(result)
      setReview({
        grade: result.correction.grade,
        feedback: result.correction.feedback,
        strengths: result.correction.strengths,
        improvements: result.correction.improvements,
      })
    })
  }

  function save() {
    setError("")
    if (!ai) return
    startSave(async () => {
      const res = await saveCorrectionAction({
        studentId: form.studentId,
        title: form.title,
        subject: form.subject,
        activityType: form.activityType || null,
        rubric: form.rubric || null,
        grade: review.grade,
        feedback: review.feedback,
        strengths: review.strengths,
        improvements: review.improvements,
        aiSuggestion: JSON.stringify(ai),
        generatedBy: "ai_edited",
        status: "DONE",
      })
      if (!res.success) { setError(res.error); return }
      router.push("/correcoes")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <FormSection title="Contexto da correção">
        <FormField label="Aluno" required>
          <StudentPicker students={students} value={form.studentId} onChange={(id) => set("studentId", id)} required />
        </FormField>
        <FormField label="Matéria" required>
          <input className="app-input" value={form.subject} onChange={(e) => set("subject", e.target.value)} required />
        </FormField>
        <FormField label="Título da atividade" required full>
          <input className="app-input" placeholder="Ex: Redação sobre as férias" value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </FormField>
        <FormField label="Tipo">
          <input className="app-input" placeholder="Redação, lista, caderno, prova..." value={form.activityType} onChange={(e) => set("activityType", e.target.value)} />
        </FormField>
        <FormField label="Rubrica (opcional)" full hint="Se você tiver critérios específicos, cole aqui.">
          <textarea className="app-input" rows={2} value={form.rubric} onChange={(e) => set("rubric", e.target.value)} />
        </FormField>
      </FormSection>

      <FormSection title="Foto da atividade" cols={1}>
        <FormField label="Imagem (PNG/JPG/WebP/GIF, até 5MB)" required>
          <input type="file" accept="image/*" onChange={handleFile} className="app-input" />
        </FormField>
        {preview && (
          <div className="mt-2 rounded-lg overflow-hidden border" style={{ borderColor: "var(--color-app-border)" }}>
            <img src={preview} alt="Preview" className="max-h-80 w-auto" />
          </div>
        )}
      </FormSection>

      {!ai && (
        <button type="button" onClick={analyze} disabled={analyzing || !form.imageBase64} className="app-btn-primary w-full">
          {analyzing ? "Analisando com Claude Vision (30-60s)..." : "✨ Analisar com IA"}
        </button>
      )}

      {ai && (
        <>
          <FormSection title="Transcrição da imagem (IA)" cols={1}>
            <p className="text-sm whitespace-pre-wrap">{ai.transcript}</p>
          </FormSection>

          <FormSection title="Correção sugerida (edite antes de salvar)">
            <FormField label="Conceito / Nota" full>
              <input className="app-input" value={review.grade} onChange={(e) => setReview((r) => ({ ...r, grade: e.target.value }))} />
            </FormField>
            <FormField label="Pontos fortes" full>
              <textarea className="app-input" rows={3} value={review.strengths} onChange={(e) => setReview((r) => ({ ...r, strengths: e.target.value }))} />
            </FormField>
            <FormField label="A melhorar" full>
              <textarea className="app-input" rows={3} value={review.improvements} onChange={(e) => setReview((r) => ({ ...r, improvements: e.target.value }))} />
            </FormField>
            <FormField label="Feedback para o aluno" full hint="Tom apropriado para criança de 8-9 anos.">
              <textarea className="app-input" rows={5} value={review.feedback} onChange={(e) => setReview((r) => ({ ...r, feedback: e.target.value }))} />
            </FormField>
            {ai.correction.bnccAlignment.length > 0 && (
              <FormField label="Alinhamento BNCC (sugerido)" full>
                <div className="flex flex-wrap gap-1">
                  {ai.correction.bnccAlignment.map((c) => <span key={c} className="app-pill">{c}</span>)}
                </div>
              </FormField>
            )}
          </FormSection>

          <div className="flex gap-2">
            <button type="button" onClick={save} className="app-btn-primary" disabled={saving}>
              {saving ? "Salvando..." : "Salvar correção"}
            </button>
            <button type="button" onClick={analyze} className="app-btn-ghost" disabled={analyzing}>
              Re-analisar
            </button>
          </div>
        </>
      )}

      {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
    </div>
  )
}
