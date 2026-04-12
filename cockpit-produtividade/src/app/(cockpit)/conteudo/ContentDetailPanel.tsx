"use client"

import { useCallback, useState, useTransition } from "react"
import {
  X, Loader2, Archive, ChevronRight, ChevronLeft,
  Lightbulb, FileText, ExternalLink, Sparkles, RefreshCw,
  Type, Image, Hash, Mic, Scissors, CheckCircle, Calendar, Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateContentAction, advanceContentPhaseAction, archiveContentAction } from "@/app/actions/content.actions"
import { CONTENT_SKILLS, type SkillId } from "@/config/content-skills"
import type { Area, ContentPhase } from "@/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Content = any

const PHASE_ORDER: ContentPhase[] = [
  "IDEA", "RESEARCH", "SCRIPT", "TITLE", "THUMBNAIL", "DESCRIPTION",
  "RECORDING", "EDITING", "REVIEW", "SCHEDULED", "PUBLISHED",
]

const PHASE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  IDEA: { label: "Ideação", icon: Lightbulb, color: "text-violet-500" },
  RESEARCH: { label: "Pesquisa", icon: FileText, color: "text-blue-500" },
  SCRIPT: { label: "Roteiro", icon: FileText, color: "text-amber-500" },
  TITLE: { label: "Título", icon: Type, color: "text-orange-500" },
  THUMBNAIL: { label: "Thumbnail", icon: Image, color: "text-pink-500" },
  DESCRIPTION: { label: "Descrição", icon: Hash, color: "text-cyan-500" },
  RECORDING: { label: "Gravação", icon: Mic, color: "text-red-500" },
  EDITING: { label: "Edição", icon: Scissors, color: "text-pink-500" },
  REVIEW: { label: "Revisão", icon: CheckCircle, color: "text-emerald-500" },
  SCHEDULED: { label: "Agendado", icon: Calendar, color: "text-emerald-500" },
  PUBLISHED: { label: "Publicado", icon: Send, color: "text-accent" },
}

interface Props {
  content: Content
  areas: Area[]
  onClose: () => void
  onUpdate: (c: Content) => void
  onArchive: (id: string) => void
}

export function ContentDetailPanel({ content, areas, onClose, onUpdate, onArchive }: Props) {
  const [isPending, startTransition] = useTransition()
  const skill = content.skill ? CONTENT_SKILLS[content.skill as SkillId] : null
  const skillPhases = skill?.phases ?? []
  const currentPhaseConfig = skillPhases.find((p) => p.id === content.phase) ?? null

  // Fields
  const [title, setTitle] = useState(content.title)
  const [targetDuration, setTargetDuration] = useState<number>(content.targetDuration ?? 0)
  const [hook, setHook] = useState(content.hook ?? "")
  const [script, setScript] = useState(content.script ?? "")
  const [research, setResearch] = useState(content.research ?? "")
  const [thumbnailNotes, setThumbnailNotes] = useState(content.thumbnailNotes ?? "")
  const [description, setDescription] = useState(content.description ?? "")
  const [notes, setNotes] = useState(content.notes ?? "")
  const [localAreaIds, setLocalAreaIds] = useState<string[]>(() => {
    try {
      if (Array.isArray(content.areas) && content.areas.length > 0) return content.areas.map((a: any) => a.area?.id ?? a.areaId).filter(Boolean)
      if (content.areaId) return [content.areaId]
      return []
    } catch { return [] }
  })

  // AI
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiOptions, setAiOptions] = useState<any[] | null>(null)
  const [aiField, setAiField] = useState<string | null>(null)
  const [aiAction, setAiAction] = useState<string | null>(null)
  const [aiConsideration, setAiConsideration] = useState("")
  const [showTips, setShowTips] = useState(false)

  const currentIdx = PHASE_ORDER.indexOf(content.phase)
  const prevPhase = currentIdx > 0 ? PHASE_ORDER[currentIdx - 1] : null
  const nextPhase = currentIdx < PHASE_ORDER.length - 1 ? PHASE_ORDER[currentIdx + 1] : null

  // ── Helpers ───────────────────────────────────────────────────────────

  function save(data: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateContentAction(content.id, data)
      if (result.success) onUpdate(result.data as Content)
    })
  }

  function handlePhaseChange(phase: ContentPhase) {
    startTransition(async () => {
      const result = await advanceContentPhaseAction(content.id, phase)
      if (result.success) onUpdate(result.data as Content)
    })
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveContentAction(content.id)
      if (result.success) { onArchive(content.id); onClose() }
    })
  }

  function handleToggleArea(areaId: string) {
    const next = localAreaIds.includes(areaId) ? localAreaIds.filter((id) => id !== areaId) : [...localAreaIds, areaId]
    setLocalAreaIds(next)
    save({ areaIds: next })
  }

  // ── AI ────────────────────────────────────────────────────────────────

  const callAI = useCallback(async (action: string, extraContext?: string) => {
    setAiLoading(action); setAiResult(null); setAiOptions(null); setAiAction(action); setAiField(null)
    try {
      const res = await fetch("/api/content/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action, skill: content.skill, phase: content.phase,
          title, hook, script, notes: notes + (extraContext ? `\n\nConsiderações: ${extraContext}` : ""),
          research, series: content.series, targetDuration,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.type === "options" && data.options) { setAiOptions(data.options); setAiField(data.field) }
        else setAiResult(data.result)
      } else setAiResult("Erro. Verifique a ANTHROPIC_API_KEY.")
    } catch { setAiResult("Erro de conexão.") }
    setAiLoading(null); setAiConsideration("")
  }, [content.skill, content.phase, content.series, title, hook, script, notes, research])

  function selectOption(opt: any) {
    if (aiField === "hook") { setHook(opt.text); save({ hook: opt.text }) }
    else if (aiField === "title") { setTitle(opt.text); save({ title: opt.text }) }
    setAiOptions(null); setAiField(null)
  }

  function useResult(field: string) {
    if (!aiResult) return
    const map: Record<string, [string, (v: string) => void]> = {
      script: ["script", setScript], research: ["research", setResearch],
      thumbnailNotes: ["thumbnailNotes", setThumbnailNotes], description: ["description", setDescription],
    }
    const [key, setter] = map[field] ?? []
    if (key && setter) { setter(aiResult); save({ [key]: aiResult }) }
    setAiResult(null); setAiAction(null)
  }

  function regenerate() {
    if (!aiAction || !aiConsideration.trim()) return
    callAI(aiAction, aiConsideration)
  }

  // ── Components ────────────────────────────────────────────────────────

  function AiBtn({ action, label }: { action: string; label: string }) {
    return (
      <button onClick={() => callAI(action)} disabled={!!aiLoading}
        className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border bg-accent/5 border-accent/20 text-accent hover:bg-accent/15 transition-all disabled:opacity-50">
        {aiLoading === action ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {label}
      </button>
    )
  }

  function Field({ label, value, onChange, field, placeholder, rows, mono }: {
    label: string; value: string; onChange: (v: string) => void; field: string
    placeholder: string; rows: number; mono?: boolean
  }) {
    return (
      <div>
        <p className="text-xs font-medium text-cockpit-muted mb-2">{label}</p>
        <textarea value={value} onChange={(e) => onChange(e.target.value)}
          onBlur={() => save({ [field]: value || null })} placeholder={placeholder} rows={rows}
          className={cn("w-full px-4 py-3 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none leading-relaxed", mono && "font-mono text-[13px]")} />
      </div>
    )
  }

  function PhaseHeader({ phase }: { phase: string }) {
    const meta = PHASE_META[phase]
    if (!meta) return null
    const Icon = meta.icon
    return (
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className={meta.color} />
        <h2 className="text-sm font-bold text-cockpit-text">{meta.label}</h2>
        {currentPhaseConfig && <span className="text-[10px] text-cockpit-muted ml-1">— {currentPhaseConfig.description}</span>}
      </div>
    )
  }

  // ── AI Result Panel ───────────────────────────────────────────────────

  function AiResultPanel({ acceptField }: { acceptField?: string }) {
    if (aiOptions && aiOptions.length > 0) return (
      <div className="rounded-xl border border-accent/30 bg-accent/5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-accent/20">
          <p className="text-xs font-semibold text-accent flex items-center gap-1"><Sparkles size={12} /> {aiField === "hook" ? "Escolha um hook" : aiField === "title" ? "Escolha um título" : "Opções"}</p>
          <button onClick={() => setAiOptions(null)} className="text-cockpit-muted hover:text-cockpit-text"><X size={14} /></button>
        </div>
        <div className="p-2 space-y-1.5 max-h-80 overflow-y-auto">{aiOptions.map((opt: any, i: number) => (
          <button key={i} onClick={() => selectOption(opt)} className="w-full text-left p-3 rounded-xl border border-cockpit-border bg-cockpit-bg hover:border-accent/40 hover:bg-accent/5 transition-all group">
            <p className="text-sm text-cockpit-text group-hover:text-accent font-medium">{opt.text}</p>
            <div className="flex items-center gap-2 mt-1.5">
              {opt.style && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cockpit-border-light text-cockpit-muted">{opt.style}</span>}
              {opt.why && <span className="text-[10px] text-cockpit-muted">{opt.why}</span>}
            </div>
          </button>
        ))}</div>
        <RegenerateBar />
      </div>
    )

    if (aiResult) return (
      <div className="rounded-xl border border-accent/30 bg-accent/5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-accent/20">
          <p className="text-xs font-semibold text-accent flex items-center gap-1"><Sparkles size={12} /> Sugestão da IA</p>
          <button onClick={() => setAiResult(null)} className="text-cockpit-muted hover:text-cockpit-text"><X size={14} /></button>
        </div>
        <div className="px-4 py-3 text-sm text-cockpit-text whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">{aiResult}</div>
        <div className="px-4 py-2 border-t border-accent/20 flex items-center gap-2">
          {acceptField && <button onClick={() => useResult(acceptField)} className="text-xs text-accent font-semibold hover:underline">Usar esta sugestão</button>}
          <button onClick={() => setAiResult(null)} className="text-xs text-cockpit-muted hover:text-cockpit-text ml-auto">Descartar</button>
        </div>
        <RegenerateBar />
      </div>
    )

    return null
  }

  function RegenerateBar() {
    return (
      <div className="px-4 py-2.5 border-t border-accent/20 flex items-center gap-2">
        <input type="text" value={aiConsideration} onChange={(e) => setAiConsideration(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") regenerate() }}
          placeholder="Ajustes? (ex: mais curto, tom informal, público jovem)..."
          className="flex-1 px-3 py-1.5 bg-cockpit-bg border border-cockpit-border rounded-lg text-xs text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-1 focus:ring-accent/30" />
        <button onClick={regenerate} disabled={!aiConsideration.trim() || !!aiLoading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-accent font-medium border border-accent/20 rounded-lg hover:bg-accent/10 disabled:opacity-50">
          <RefreshCw size={11} /> Regenerar
        </button>
      </div>
    )
  }

  // ── Phase content ─────────────────────────────────────────────────────

  function renderPhase() {
    const p = content.phase as string

    if (p === "IDEA") {
      const isShort = content.skill === "SHORT_VIDEO"
      const isLong = content.skill === "LONG_VIDEO"
      const isInsta = content.skill === "INSTAGRAM"
      const presets = isShort
        ? [{ label: "15s", value: 15 }, { label: "30s", value: 30 }, { label: "60s", value: 60 }, { label: "90s", value: 90 }]
        : isLong
        ? [{ label: "8 min", value: 480 }, { label: "10 min", value: 600 }, { label: "15 min", value: 900 }, { label: "20 min", value: 1200 }, { label: "25 min", value: 1500 }]
        : [{ label: "15s", value: 15 }, { label: "30s", value: 30 }, { label: "60s", value: 60 }, { label: "90s", value: 90 }]

      function formatDur(s: number) { return s >= 60 ? `${Math.floor(s / 60)} min${s % 60 > 0 ? ` ${s % 60}s` : ""}` : `${s}s` }

      return (<>
        <PhaseHeader phase="IDEA" />

        {/* Duration selector */}
        <div className="mb-6">
          <p className="text-xs font-medium text-cockpit-muted mb-2">Duração estimada do conteúdo</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button key={p.value} onClick={() => { setTargetDuration(p.value); save({ targetDuration: p.value }) }}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                  targetDuration === p.value ? "bg-accent text-black border-accent" : "border-cockpit-border text-cockpit-muted hover:border-accent/30 hover:text-cockpit-text"
                )}>
                {p.label}
              </button>
            ))}
          </div>
          {targetDuration > 0 && (
            <p className="text-[10px] text-cockpit-muted mt-2">
              {isShort && targetDuration <= 30 && "Ideal para conteúdo direto: hook → ponto único → CTA. Máxima taxa de conclusão."}
              {isShort && targetDuration > 30 && targetDuration <= 60 && "Sweet spot: espaço para storytelling ou tutorial com 3-5 pontos. Melhor balanço views/engajamento."}
              {isShort && targetDuration > 60 && "Formato longo para Shorts/Reels: permite aprofundamento mas exige retenção alta. Use curiosity stacking."}
              {isLong && targetDuration <= 600 && "Formato compacto: ideal para tutoriais diretos ou análises rápidas. Foco em eficiência."}
              {isLong && targetDuration > 600 && targetDuration <= 900 && "Formato clássico do YouTube: espaço ideal para conteúdo denso com bom AVD."}
              {isLong && targetDuration > 900 && "Formato longo: requer excelente estrutura de retenção. Use capítulos e open loops a cada 3-4 min."}
              {isInsta && "Reels 30-90s performam melhor para educação. 15s para trends virais."}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <AiBtn action="generate_hook" label="Gerar hooks" />
          <AiBtn action="generate_research" label="Sugerir pesquisa" />
        </div>
        <AiResultPanel acceptField={aiAction === "generate_research" ? "research" : undefined} />
        <Field label="Hook — o gancho dos primeiros segundos" value={hook} onChange={setHook} field="hook" placeholder="O que vai parar o scroll?" rows={3} />
        <Field label="Pesquisa & Referências" value={research} onChange={setResearch} field="research" placeholder="Links, dados, fontes, inspirações..." rows={4} />
      </>)
    }

    if (p === "RESEARCH") return (<>
      <PhaseHeader phase="RESEARCH" />
      <div className="flex flex-wrap gap-2 mb-6">
        <AiBtn action="generate_research" label="Sugerir pontos de pesquisa" />
      </div>
      <AiResultPanel acceptField="research" />
      <Field label="Pesquisa & Referências" value={research} onChange={setResearch} field="research" placeholder="Fontes, dados, estatísticas, ângulos..." rows={10} />
    </>)

    if (p === "SCRIPT") return (<>
      <PhaseHeader phase="SCRIPT" />
      <div className="flex flex-wrap gap-2 mb-6">
        <AiBtn action="generate_script" label="Gerar roteiro completo" />
        <AiBtn action="generate_hook" label="Refinar hook" />
      </div>
      <AiResultPanel acceptField="script" />
      <Field label="Roteiro" value={script} onChange={setScript} field="script" placeholder="Escreva o roteiro..." rows={16} mono />
      {skill && skill.scriptTemplates.length > 0 && !script && (
        <div>
          <p className="text-[10px] text-cockpit-muted font-medium mb-2">Templates:</p>
          <div className="grid grid-cols-2 gap-2">{skill.scriptTemplates.map((t) => (
            <button key={t.name} onClick={() => { setScript(t.structure.join("\n\n")); save({ script: t.structure.join("\n\n") }) }}
              className="text-left p-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl hover:border-accent/30">
              <p className="text-xs font-medium text-cockpit-text">{t.name}</p>
              <p className="text-[10px] text-cockpit-muted mt-0.5 line-clamp-2">{t.structure.join(" → ")}</p>
            </button>
          ))}</div>
        </div>
      )}
      <Field label="Hook" value={hook} onChange={setHook} field="hook" placeholder="Hook..." rows={2} />
    </>)

    if (p === "TITLE") return (<>
      <PhaseHeader phase="TITLE" />
      <div className="flex flex-wrap gap-2 mb-6">
        <AiBtn action="generate_titles" label="Gerar opções de título" />
      </div>
      <AiResultPanel />
      <div>
        <p className="text-xs font-medium text-cockpit-muted mb-2">Título atual</p>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          onBlur={() => save({ title })}
          className="w-full px-4 py-3 bg-cockpit-bg border border-cockpit-border rounded-xl text-base font-semibold text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30" />
      </div>
    </>)

    if (p === "THUMBNAIL") return (<>
      <PhaseHeader phase="THUMBNAIL" />
      <div className="flex flex-wrap gap-2 mb-6">
        <AiBtn action="generate_thumbnail" label="Gerar conceitos visuais" />
      </div>
      <AiResultPanel acceptField="thumbnailNotes" />
      <Field label="Notas da Thumbnail / Arte" value={thumbnailNotes} onChange={setThumbnailNotes} field="thumbnailNotes" placeholder="Composição, expressão facial, texto overlay, cores, estilo..." rows={8} />
    </>)

    if (p === "DESCRIPTION") return (<>
      <PhaseHeader phase="DESCRIPTION" />
      <div className="flex flex-wrap gap-2 mb-6">
        <AiBtn action="generate_description" label="Gerar descrição e hashtags" />
      </div>
      <AiResultPanel acceptField="description" />
      <Field label="Descrição / Caption" value={description} onChange={setDescription} field="description" placeholder="Descrição para a plataforma, SEO, caption..." rows={8} />
      <Field label="Hashtags / Tags" value={(content.hashtags ?? []).join(", ")} onChange={() => {}} field="" placeholder="Serão preenchidas pela IA" rows={2} />
    </>)

    if (p === "RECORDING") return (<>
      <PhaseHeader phase="RECORDING" />
      <div className="p-3 bg-cockpit-bg border border-cockpit-border rounded-xl mb-4">
        <p className="text-[10px] text-cockpit-muted font-medium mb-1">Hook</p>
        <p className="text-sm text-cockpit-text">{hook || "—"}</p>
      </div>
      {script && <div className="p-3 bg-cockpit-bg border border-cockpit-border rounded-xl">
        <p className="text-[10px] text-cockpit-muted font-medium mb-1">Roteiro</p>
        <p className="text-sm text-cockpit-text whitespace-pre-wrap font-mono text-[13px] max-h-64 overflow-y-auto">{script}</p>
      </div>}
      <Field label="Notas de gravação" value={notes} onChange={setNotes} field="notes" placeholder="Setup, ângulos, takes..." rows={4} />
    </>)

    if (p === "EDITING") return (<>
      <PhaseHeader phase="EDITING" />
      <Field label="Notas de edição" value={notes} onChange={setNotes} field="notes" placeholder="Cortes, efeitos, música, SFX, timing..." rows={6} />
      {script && <div className="p-3 bg-cockpit-bg border border-cockpit-border rounded-xl">
        <p className="text-[10px] text-cockpit-muted font-medium mb-1">Roteiro (referência)</p>
        <p className="text-xs text-cockpit-muted whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{script}</p>
      </div>}
    </>)

    if (p === "REVIEW") return (<>
      <PhaseHeader phase="REVIEW" />
      <div className="flex justify-center mb-6">
        <AiBtn action="review" label="Revisar conteúdo completo com IA" />
      </div>
      <AiResultPanel />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hook && <div className="p-3 bg-cockpit-bg border border-cockpit-border rounded-xl"><p className="text-[10px] text-cockpit-muted font-medium mb-1">Hook</p><p className="text-sm text-cockpit-text">{hook}</p></div>}
        {title && <div className="p-3 bg-cockpit-bg border border-cockpit-border rounded-xl"><p className="text-[10px] text-cockpit-muted font-medium mb-1">Título</p><p className="text-sm font-semibold text-cockpit-text">{title}</p></div>}
      </div>
      {script && <div className="p-3 bg-cockpit-bg border border-cockpit-border rounded-xl"><p className="text-[10px] text-cockpit-muted font-medium mb-1">Roteiro</p><p className="text-xs text-cockpit-muted whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">{script}</p></div>}
      {description && <div className="p-3 bg-cockpit-bg border border-cockpit-border rounded-xl"><p className="text-[10px] text-cockpit-muted font-medium mb-1">Descrição</p><p className="text-xs text-cockpit-muted max-h-24 overflow-y-auto">{description}</p></div>}
    </>)

    // SCHEDULED / PUBLISHED
    return (<>
      <PhaseHeader phase={p} />
      {content.publishedUrl && <a href={content.publishedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-accent hover:underline p-3 bg-cockpit-bg border border-cockpit-border rounded-xl"><ExternalLink size={14} /> {content.publishedUrl}</a>}
      <Field label="Anotações" value={notes} onChange={setNotes} field="notes" placeholder="Métricas, lições aprendidas..." rows={4} />
    </>)
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-4 sm:inset-6 lg:inset-y-4 lg:left-[15%] lg:right-4 z-50 bg-cockpit-surface border border-cockpit-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-cockpit-border flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {skill && <span className="text-xl">{skill.icon}</span>}
              <div className="flex-1 min-w-0">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => { if (title.trim() && title !== content.title) save({ title }) }}
                  className="w-full text-lg font-bold text-cockpit-text bg-transparent border-b border-transparent hover:border-cockpit-border focus:border-accent focus:outline-none py-0.5" />
                <div className="flex items-center gap-2 mt-1">
                  {skill && <span className="text-[11px] text-cockpit-muted">{skill.label}</span>}
                  {content.series && <span className="text-[11px] text-cockpit-muted">· 📂 {content.series}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={handleArchive} className="p-2 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10"><Archive size={16} /></button>
              <button onClick={onClose} className="p-2 text-cockpit-muted hover:text-cockpit-text rounded-lg hover:bg-cockpit-surface-hover"><X size={16} /></button>
            </div>
          </div>

          {/* Phase stepper */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {PHASE_ORDER.filter((ph) => !skill || skillPhases.some((sp) => sp.id === ph) || ["TITLE", "DESCRIPTION"].includes(ph)).map((ph) => {
              const isActive = ph === content.phase
              const isPast = PHASE_ORDER.indexOf(ph) < currentIdx
              const meta = PHASE_META[ph]
              const Icon = meta?.icon
              return (
                <button key={ph} onClick={() => handlePhaseChange(ph)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border",
                    isActive ? "bg-accent text-black border-accent" :
                    isPast ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                    "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}>
                  {Icon && <Icon size={12} />} {meta?.label ?? ph}
                </button>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {renderPhase()}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:flex w-72 flex-shrink-0 border-l border-cockpit-border flex-col overflow-y-auto">
            <div className="px-4 py-5 space-y-5">
              {areas.length > 0 && (
                <div>
                  <p className="text-[10px] text-cockpit-muted font-medium uppercase tracking-wider mb-2">Áreas</p>
                  <div className="flex flex-wrap gap-1.5">{areas.map((a) => (
                    <button key={a.id} onClick={() => handleToggleArea(a.id)} className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all",
                      localAreaIds.includes(a.id) ? "border-transparent text-white" : "border-cockpit-border text-cockpit-muted"
                    )} style={localAreaIds.includes(a.id) ? { backgroundColor: a.color } : undefined}>{a.icon} {a.name}</button>
                  ))}</div>
                </div>
              )}
              <div>
                <p className="text-[10px] text-cockpit-muted font-medium uppercase tracking-wider mb-2">Anotações</p>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => save({ notes: notes || null })}
                  placeholder="Notas livres..." rows={4}
                  className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-xs text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-1 focus:ring-accent/30 resize-none" />
              </div>
              {currentPhaseConfig && currentPhaseConfig.tips.length > 0 && (
                <div>
                  <button onClick={() => setShowTips(!showTips)} className="flex items-center gap-1.5 text-[10px] text-cockpit-muted font-medium uppercase tracking-wider mb-2 hover:text-cockpit-text w-full text-left">
                    <Lightbulb size={11} className="text-amber-500" /> Dicas ({currentPhaseConfig.tips.length})
                  </button>
                  {showTips && <div className="space-y-1.5">{currentPhaseConfig.tips.map((tip, i) => (
                    <div key={i} className="px-2.5 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                      <p className="text-[10px] text-cockpit-text leading-relaxed">{tip}</p>
                    </div>
                  ))}</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-cockpit-border bg-cockpit-bg/50 flex items-center justify-between flex-shrink-0">
          {prevPhase ? (
            <button onClick={() => handlePhaseChange(prevPhase)} className="flex items-center gap-1 px-3 py-2 text-xs text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl">
              <ChevronLeft size={13} /> {PHASE_META[prevPhase]?.label ?? prevPhase}
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            {isPending && <Loader2 size={14} className="animate-spin text-cockpit-muted" />}
            <span className="text-[10px] text-cockpit-muted">Salva automaticamente</span>
          </div>
          {nextPhase ? (
            <button onClick={() => handlePhaseChange(nextPhase)}
              className="flex items-center gap-1 px-4 py-2 bg-accent text-black text-xs font-semibold rounded-xl hover:bg-accent-hover">
              {PHASE_META[nextPhase]?.label ?? nextPhase} <ChevronRight size={13} />
            </button>
          ) : <div />}
        </div>
      </div>
    </>
  )
}
