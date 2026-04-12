"use client"

import { useCallback, useState, useTransition } from "react"
import {
  X, Loader2, Archive, ChevronRight, ChevronLeft,
  Lightbulb, FileText, ExternalLink, Sparkles, RefreshCw,
  Scissors, Send, PenTool,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateContentAction, advanceContentPhaseAction, archiveContentAction } from "@/app/actions/content.actions"
import { CONTENT_SKILLS, type SkillId } from "@/config/content-skills"
import type { Area, ContentPhase } from "@/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Content = any

const PHASES: { id: ContentPhase; label: string; icon: React.ElementType; color: string }[] = [
  { id: "IDEATION", label: "Idealização", icon: Lightbulb, color: "text-violet-500" },
  { id: "ELABORATION", label: "Elaboração", icon: PenTool, color: "text-amber-500" },
  { id: "EDITING_SENT", label: "Enviado p/ Edição", icon: Scissors, color: "text-pink-500" },
  { id: "PUBLISHED", label: "Publicado", icon: Send, color: "text-accent" },
]

// Sub-sections dentro de Elaboração
const ELABORATION_SECTIONS = ["hook", "roteiro", "titulo", "thumbnail", "descricao"] as const
type ElabSection = typeof ELABORATION_SECTIONS[number]
const ELAB_LABEL: Record<ElabSection, string> = { hook: "Hook", roteiro: "Roteiro", titulo: "Título", thumbnail: "Thumbnail", descricao: "Descrição & Hashtags" }

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

  // Fields
  const [title, setTitle] = useState(content.title)
  const [targetDuration, setTargetDuration] = useState<number>(content.targetDuration ?? 0)
  const [hook, setHook] = useState(content.hook ?? "")
  const [script, setScript] = useState(content.script ?? "")
  const [research, setResearch] = useState(content.research ?? "")
  const [thumbnailNotes, setThumbnailNotes] = useState(content.thumbnailNotes ?? "")
  const [description, setDescription] = useState(content.description ?? "")
  const [notes, setNotes] = useState(content.notes ?? "")
  const [rawVideoUrl, setRawVideoUrl] = useState(content.rawVideoUrl ?? "")
  const [localAreaIds, setLocalAreaIds] = useState<string[]>(() => {
    try {
      if (Array.isArray(content.areas) && content.areas.length > 0) return content.areas.map((a: any) => a.area?.id ?? a.areaId).filter(Boolean)
      if (content.areaId) return [content.areaId]
      return []
    } catch { return [] }
  })

  // Elaboration active section
  const [activeSection, setActiveSection] = useState<ElabSection>("hook")

  // AI
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiOptions, setAiOptions] = useState<any[] | null>(null)
  const [aiField, setAiField] = useState<string | null>(null)
  const [aiAction, setAiAction] = useState<string | null>(null)
  const [aiConsideration, setAiConsideration] = useState("")

  const currentPhaseIdx = PHASES.findIndex((p) => p.id === content.phase)
  const prevPhase = currentPhaseIdx > 0 ? PHASES[currentPhaseIdx - 1] : null
  const nextPhase = currentPhaseIdx < PHASES.length - 1 ? PHASES[currentPhaseIdx + 1] : null

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
  }, [content.skill, content.phase, content.series, title, hook, script, notes, research, targetDuration])

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

  function regenerate() { if (aiAction && aiConsideration.trim()) callAI(aiAction, aiConsideration) }

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

  function AiResultPanel({ acceptField }: { acceptField?: string }) {
    if (aiOptions && aiOptions.length > 0) return (
      <div className="rounded-xl border border-accent/30 bg-accent/5 overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-accent/20">
          <p className="text-xs font-semibold text-accent flex items-center gap-1"><Sparkles size={12} /> {aiField === "hook" ? "Escolha um hook" : aiField === "title" ? "Escolha um título" : "Opções"}</p>
          <button onClick={() => setAiOptions(null)} className="text-cockpit-muted hover:text-cockpit-text"><X size={14} /></button>
        </div>
        <div className="p-2 space-y-1.5 max-h-80 overflow-y-auto">{aiOptions.map((opt: any, i: number) => (
          <button key={i} onClick={() => selectOption(opt)} className="w-full text-left p-3 rounded-xl border border-cockpit-border bg-cockpit-bg hover:border-accent/40 hover:bg-accent/5 transition-all group">
            <p className="text-sm text-cockpit-text group-hover:text-accent font-medium">{opt.text}</p>
            {(opt.style || opt.why) && <div className="flex items-center gap-2 mt-1.5">
              {opt.style && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cockpit-border-light text-cockpit-muted">{opt.style}</span>}
              {opt.why && <span className="text-[10px] text-cockpit-muted">{opt.why}</span>}
            </div>}
          </button>
        ))}</div>
        <RegenBar />
      </div>
    )
    if (aiResult) return (
      <div className="rounded-xl border border-accent/30 bg-accent/5 overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-accent/20">
          <p className="text-xs font-semibold text-accent flex items-center gap-1"><Sparkles size={12} /> Sugestão da IA</p>
          <button onClick={() => setAiResult(null)} className="text-cockpit-muted hover:text-cockpit-text"><X size={14} /></button>
        </div>
        <div className="px-4 py-3 text-sm text-cockpit-text whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">{aiResult}</div>
        <div className="px-4 py-2 border-t border-accent/20 flex items-center gap-2">
          {acceptField && <button onClick={() => useResult(acceptField)} className="text-xs text-accent font-semibold hover:underline">Usar esta sugestão</button>}
          <button onClick={() => setAiResult(null)} className="text-xs text-cockpit-muted hover:text-cockpit-text ml-auto">Descartar</button>
        </div>
        <RegenBar />
      </div>
    )
    return null
  }

  function RegenBar() {
    return (
      <div className="px-4 py-2.5 border-t border-accent/20 flex items-center gap-2">
        <input type="text" value={aiConsideration} onChange={(e) => setAiConsideration(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") regenerate() }}
          placeholder="Ajustes? (ex: mais curto, tom informal)..."
          className="flex-1 px-3 py-1.5 bg-cockpit-bg border border-cockpit-border rounded-lg text-xs text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-1 focus:ring-accent/30" />
        <button onClick={regenerate} disabled={!aiConsideration.trim() || !!aiLoading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-accent font-medium border border-accent/20 rounded-lg hover:bg-accent/10 disabled:opacity-50">
          <RefreshCw size={11} /> Regenerar
        </button>
      </div>
    )
  }

  // ── Duration presets ──────────────────────────────────────────────────

  const durationPresets = content.skill === "LONG_VIDEO"
    ? [{ l: "8 min", v: 480 }, { l: "10 min", v: 600 }, { l: "15 min", v: 900 }, { l: "20 min", v: 1200 }, { l: "25 min", v: 1500 }, { l: "30 min", v: 1800 }]
    : [{ l: "30s", v: 30 }, { l: "60s", v: 60 }, { l: "1:30", v: 90 }, { l: "2:00", v: 120 }, { l: "2:30", v: 150 }, { l: "3:00", v: 180 }]

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
                  {targetDuration > 0 && <span className="text-[11px] text-cockpit-muted">· {targetDuration >= 60 ? `${Math.floor(targetDuration / 60)}min` : `${targetDuration}s`}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={handleArchive} className="p-2 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10"><Archive size={16} /></button>
              <button onClick={onClose} className="p-2 text-cockpit-muted hover:text-cockpit-text rounded-lg hover:bg-cockpit-surface-hover"><X size={16} /></button>
            </div>
          </div>

          {/* Phase stepper — 4 fases */}
          <div className="flex items-center gap-2">
            {PHASES.map((ph, i) => {
              const isActive = ph.id === content.phase
              const isPast = i < currentPhaseIdx
              const Icon = ph.icon
              return (
                <button key={ph.id} onClick={() => handlePhaseChange(ph.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border flex-1 justify-center",
                    isActive ? "bg-accent text-black border-accent" :
                    isPast ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                    "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}>
                  <Icon size={14} /> {ph.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ═══ IDEALIZAÇÃO ═══ */}
            {content.phase === "IDEATION" && (<>
              <div className="mb-4">
                <p className="text-xs font-medium text-cockpit-muted mb-2">Duração estimada</p>
                <div className="flex flex-wrap gap-2">
                  {durationPresets.map((p) => (
                    <button key={p.v} onClick={() => { setTargetDuration(p.v); save({ targetDuration: p.v }) }}
                      className={cn("px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                        targetDuration === p.v ? "bg-accent text-black border-accent" : "border-cockpit-border text-cockpit-muted hover:border-accent/30")}>
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <AiBtn action="generate_hook" label="Gerar hooks" />
                <AiBtn action="generate_research" label="Sugerir pesquisa" />
              </div>
              <AiResultPanel acceptField={aiAction === "generate_research" ? "research" : undefined} />
              <Field label="Hook — o gancho dos primeiros segundos" value={hook} onChange={setHook} field="hook" placeholder="O que vai parar o scroll?" rows={3} />
              <Field label="Pesquisa & Referências" value={research} onChange={setResearch} field="research" placeholder="Links, dados, fontes, inspirações..." rows={4} />
            </>)}

            {/* ═══ ELABORAÇÃO ═══ */}
            {content.phase === "ELABORATION" && (<>
              {/* Section tabs */}
              <div className="flex items-center gap-1 bg-cockpit-border-light rounded-xl p-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {ELABORATION_SECTIONS.map((s) => (
                  <button key={s} onClick={() => setActiveSection(s)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                      activeSection === s ? "bg-cockpit-surface text-cockpit-text shadow-sm" : "text-cockpit-muted hover:text-cockpit-text")}>
                    {ELAB_LABEL[s]}
                  </button>
                ))}
              </div>

              {/* Hook */}
              {activeSection === "hook" && (<>
                <div className="flex flex-wrap gap-2 mb-4">
                  <AiBtn action="generate_hook" label="Gerar hooks com IA" />
                </div>
                <AiResultPanel />
                <Field label="Hook" value={hook} onChange={setHook} field="hook" placeholder="O gancho dos primeiros segundos..." rows={3} />
              </>)}

              {/* Roteiro */}
              {activeSection === "roteiro" && (<>
                <div className="flex flex-wrap gap-2 mb-4">
                  <AiBtn action="generate_script" label="Gerar roteiro com IA" />
                </div>
                <AiResultPanel acceptField="script" />
                <Field label="Roteiro" value={script} onChange={setScript} field="script" placeholder="Escreva o roteiro completo..." rows={16} mono />
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
              </>)}

              {/* Título */}
              {activeSection === "titulo" && (<>
                <div className="flex flex-wrap gap-2 mb-4">
                  <AiBtn action="generate_titles" label="Gerar opções de título" />
                </div>
                <AiResultPanel />
                <div>
                  <p className="text-xs font-medium text-cockpit-muted mb-2">Título</p>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => save({ title })}
                    className="w-full px-4 py-3 bg-cockpit-bg border border-cockpit-border rounded-xl text-base font-semibold text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </>)}

              {/* Thumbnail */}
              {activeSection === "thumbnail" && (<>
                <div className="flex flex-wrap gap-2 mb-4">
                  <AiBtn action="generate_thumbnail" label="Gerar conceitos visuais" />
                </div>
                <AiResultPanel acceptField="thumbnailNotes" />
                <Field label="Notas da Thumbnail / Arte" value={thumbnailNotes} onChange={setThumbnailNotes} field="thumbnailNotes" placeholder="Composição, expressão facial, texto overlay, cores..." rows={8} />
              </>)}

              {/* Descrição */}
              {activeSection === "descricao" && (<>
                <div className="flex flex-wrap gap-2 mb-4">
                  <AiBtn action="generate_description" label="Gerar descrição e hashtags" />
                </div>
                <AiResultPanel acceptField="description" />
                <Field label="Descrição / Caption" value={description} onChange={setDescription} field="description" placeholder="Descrição para a plataforma, SEO, caption..." rows={8} />
              </>)}
            </>)}

            {/* ═══ ENVIADO P/ EDIÇÃO ═══ */}
            {content.phase === "EDITING_SENT" && (<>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-cockpit-muted mb-2">Link do vídeo bruto (Google Drive)</p>
                  <input type="url" value={rawVideoUrl} onChange={(e) => setRawVideoUrl(e.target.value)}
                    onBlur={() => save({ rawVideoUrl: rawVideoUrl || null })}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-4 py-3 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
                  {rawVideoUrl && (
                    <a href={rawVideoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-accent hover:underline mt-2">
                      <ExternalLink size={12} /> Abrir vídeo bruto
                    </a>
                  )}
                </div>
                <Field label="Notas para o editor" value={notes} onChange={setNotes} field="notes" placeholder="Instruções de corte, efeitos, música, SFX..." rows={6} />

                {/* Preview resumo */}
                <div className="space-y-2 pt-4 border-t border-cockpit-border">
                  <p className="text-[10px] text-cockpit-muted font-medium uppercase tracking-wider">Resumo do conteúdo</p>
                  {hook && <div className="p-3 bg-cockpit-bg border border-cockpit-border rounded-xl"><p className="text-[10px] text-cockpit-muted mb-1">Hook</p><p className="text-sm text-cockpit-text">{hook}</p></div>}
                  {script && <div className="p-3 bg-cockpit-bg border border-cockpit-border rounded-xl"><p className="text-[10px] text-cockpit-muted mb-1">Roteiro</p><p className="text-xs text-cockpit-muted whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">{script}</p></div>}
                </div>
              </div>
            </>)}

            {/* ═══ PUBLICADO ═══ */}
            {content.phase === "PUBLISHED" && (<>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-cockpit-muted mb-2">Link publicado</p>
                  <input type="url" value={content.publishedUrl ?? ""} onChange={(e) => save({ publishedUrl: e.target.value || null })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-4 py-3 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
                  {content.publishedUrl && (
                    <a href={content.publishedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-accent hover:underline mt-2">
                      <ExternalLink size={12} /> Abrir conteúdo publicado
                    </a>
                  )}
                </div>

                {/* Performance / análise */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <AiBtn action="review" label="Analisar performance com IA" />
                </div>
                <AiResultPanel />

                <Field label="Métricas & Análise" value={notes} onChange={setNotes} field="notes" placeholder="Views, CTR, retenção, lições aprendidas..." rows={6} />

                {/* Content summary */}
                <div className="space-y-2 pt-4 border-t border-cockpit-border">
                  <p className="text-[10px] text-cockpit-muted font-medium uppercase tracking-wider">Conteúdo produzido</p>
                  <div className="grid grid-cols-2 gap-2">
                    {hook && <div className="p-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl"><p className="text-[9px] text-cockpit-muted">Hook</p><p className="text-xs text-cockpit-text mt-0.5">{hook}</p></div>}
                    {title && <div className="p-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl"><p className="text-[9px] text-cockpit-muted">Título</p><p className="text-xs font-semibold text-cockpit-text mt-0.5">{title}</p></div>}
                  </div>
                  {description && <div className="p-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl"><p className="text-[9px] text-cockpit-muted">Descrição</p><p className="text-xs text-cockpit-muted mt-0.5 line-clamp-3">{description}</p></div>}
                </div>
              </div>
            </>)}

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
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-cockpit-border bg-cockpit-bg/50 flex items-center justify-between flex-shrink-0">
          {prevPhase ? (
            <button onClick={() => handlePhaseChange(prevPhase.id)} className="flex items-center gap-1 px-3 py-2 text-xs text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl">
              <ChevronLeft size={13} /> {prevPhase.label}
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            {isPending && <Loader2 size={14} className="animate-spin text-cockpit-muted" />}
            <span className="text-[10px] text-cockpit-muted">Salva automaticamente</span>
          </div>
          {nextPhase ? (
            <button onClick={() => handlePhaseChange(nextPhase.id)}
              className="flex items-center gap-1 px-4 py-2 bg-accent text-black text-xs font-semibold rounded-xl hover:bg-accent-hover">
              {nextPhase.label} <ChevronRight size={13} />
            </button>
          ) : <div />}
        </div>
      </div>
    </>
  )
}
