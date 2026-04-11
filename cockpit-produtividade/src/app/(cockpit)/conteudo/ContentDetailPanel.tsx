"use client"

import { useCallback, useState, useTransition } from "react"
import {
  X, Save, Loader2, Archive, ChevronRight, ChevronLeft,
  Lightbulb, FileText, ExternalLink, Sparkles, RefreshCw, Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateContentAction, advanceContentPhaseAction, archiveContentAction } from "@/app/actions/content.actions"
import { CONTENT_SKILLS, type SkillId } from "@/config/content-skills"
import type { Area, ContentPhase } from "@/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Content = any

const PHASE_ORDER: ContentPhase[] = ["IDEA", "RESEARCH", "SCRIPT", "RECORDING", "EDITING", "THUMBNAIL", "REVIEW", "SCHEDULED", "PUBLISHED"]

const PHASE_LABEL: Record<string, string> = {
  IDEA: "Ideação", RESEARCH: "Pesquisa", SCRIPT: "Roteiro", RECORDING: "Gravação",
  EDITING: "Edição", THUMBNAIL: "Thumb & Título", REVIEW: "Revisão",
  SCHEDULED: "Agendamento", PUBLISHED: "Publicado",
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
  const [hook, setHook] = useState(content.hook ?? "")
  const [script, setScript] = useState(content.script ?? "")
  const [research, setResearch] = useState(content.research ?? "")
  const [thumbnailNotes, setThumbnailNotes] = useState(content.thumbnailNotes ?? "")
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

  // Phase navigation
  const currentIdx = PHASE_ORDER.indexOf(content.phase)
  const prevPhase = currentIdx > 0 ? PHASE_ORDER[currentIdx - 1] : null
  const nextPhase = currentIdx < PHASE_ORDER.length - 1 ? PHASE_ORDER[currentIdx + 1] : null

  // ── Save ──────────────────────────────────────────────────────────────

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action, skill: content.skill, phase: content.phase,
          title, hook, script, notes: (notes + (extraContext ? `\n\nConsiderações do criador: ${extraContext}` : "")),
          research, series: content.series,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.type === "options" && data.options) { setAiOptions(data.options); setAiField(data.field) }
        else setAiResult(data.result)
      } else setAiResult("Erro ao gerar. Verifique a ANTHROPIC_API_KEY.")
    } catch { setAiResult("Erro de conexão.") }
    setAiLoading(null)
    setAiConsideration("")
  }, [content.skill, content.phase, content.series, title, hook, script, notes, research])

  function selectOption(option: any) {
    if (aiField === "hook") { setHook(option.text); save({ hook: option.text }) }
    else if (aiField === "title") { setTitle(option.text); save({ title: option.text }) }
    setAiOptions(null); setAiField(null)
  }

  function useAiResult(field: string) {
    if (!aiResult) return
    if (field === "script") { setScript(aiResult); save({ script: aiResult }) }
    else if (field === "research") { setResearch(aiResult); save({ research: aiResult }) }
    else if (field === "thumbnailNotes") { setThumbnailNotes(aiResult); save({ thumbnailNotes: aiResult }) }
    setAiResult(null); setAiAction(null)
  }

  function regenerateWithConsideration() {
    if (!aiAction || !aiConsideration.trim()) return
    callAI(aiAction, aiConsideration)
  }

  // ── AI button helper ──────────────────────────────────────────────────

  function AiBtn({ action, label, large }: { action: string; label: string; large?: boolean }) {
    return (
      <button onClick={() => callAI(action)} disabled={!!aiLoading}
        className={cn(
          "flex items-center gap-1.5 font-medium rounded-xl border transition-all disabled:opacity-50",
          large ? "px-4 py-2.5 text-xs" : "px-3 py-1.5 text-[11px]",
          aiLoading === action ? "bg-accent/10 border-accent/30 text-accent" : "bg-accent/5 border-accent/20 text-accent hover:bg-accent/15"
        )}>
        {aiLoading === action ? <Loader2 size={large ? 14 : 11} className="animate-spin" /> : <Sparkles size={large ? 14 : 11} />} {label}
      </button>
    )
  }

  // ── Phase content renderer ────────────────────────────────────────────

  function renderPhaseContent() {
    const phase = content.phase as string

    // IDEA
    if (phase === "IDEA") return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <AiBtn action="generate_hook" label="Gerar hooks" large />
          <AiBtn action="generate_titles" label="Gerar títulos" large />
          <AiBtn action="generate_research" label="Sugerir pesquisa" large />
        </div>
        <Field label="Hook (gancho)" value={hook} onChange={setHook} onSave={() => save({ hook })} placeholder="O gancho dos primeiros segundos..." rows={2} />
        <Field label="Pesquisa / Referências" value={research} onChange={setResearch} onSave={() => save({ research })} placeholder="Links, dados, fontes..." rows={4} />
      </div>
    )

    // RESEARCH
    if (phase === "RESEARCH") return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <AiBtn action="generate_research" label="Sugerir pesquisa com IA" large />
        </div>
        <Field label="Pesquisa / Referências" value={research} onChange={setResearch} onSave={() => save({ research })} placeholder="Links, dados, fontes, notas..." rows={8} />
        <Field label="Hook (gancho)" value={hook} onChange={setHook} onSave={() => save({ hook })} placeholder="Hook rascunho..." rows={2} />
      </div>
    )

    // SCRIPT
    if (phase === "SCRIPT" || phase === "RECORDING") return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <AiBtn action="generate_script" label="Gerar roteiro com IA" large />
          <AiBtn action="generate_hook" label="Refinar hook" />
          <AiBtn action="generate_titles" label="Gerar títulos" />
        </div>
        <Field label="Roteiro" value={script} onChange={setScript} onSave={() => save({ script })} placeholder="Escreva o roteiro completo..." rows={14} mono />
        {/* Templates */}
        {skill && skill.scriptTemplates.length > 0 && !script && (
          <div>
            <p className="text-[10px] text-cockpit-muted font-medium mb-2">Templates de roteiro:</p>
            <div className="grid grid-cols-2 gap-2">{skill.scriptTemplates.map((tmpl) => (
              <button key={tmpl.name} onClick={() => { setScript(tmpl.structure.join("\n\n")); save({ script: tmpl.structure.join("\n\n") }) }}
                className="text-left p-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl hover:border-accent/30 transition-colors">
                <p className="text-xs font-medium text-cockpit-text">{tmpl.name}</p>
                <p className="text-[10px] text-cockpit-muted mt-0.5 line-clamp-2">{tmpl.structure.join(" → ")}</p>
              </button>
            ))}</div>
          </div>
        )}
        <Field label="Hook" value={hook} onChange={setHook} onSave={() => save({ hook })} placeholder="Hook..." rows={2} />
      </div>
    )

    // EDITING
    if (phase === "EDITING") return (
      <div className="space-y-6">
        <Field label="Roteiro (referência)" value={script} onChange={setScript} onSave={() => save({ script })} placeholder="Roteiro..." rows={10} mono />
        <Field label="Anotações de edição" value={notes} onChange={setNotes} onSave={() => save({ notes })} placeholder="Notas de corte, efeitos, música..." rows={4} />
      </div>
    )

    // THUMBNAIL
    if (phase === "THUMBNAIL") return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <AiBtn action="generate_thumbnail" label="Gerar conceitos de arte" large />
          <AiBtn action="generate_titles" label="Gerar títulos" />
        </div>
        <Field label="Notas de Thumbnail & Arte" value={thumbnailNotes} onChange={setThumbnailNotes} onSave={() => save({ thumbnailNotes })} placeholder="Composição, expressão, texto, cores..." rows={6} />
      </div>
    )

    // REVIEW
    if (phase === "REVIEW") return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <AiBtn action="review" label="Revisar conteúdo completo com IA" large />
        </div>
        {hook && <div className="p-3 bg-cockpit-bg border border-cockpit-border rounded-xl"><p className="text-[10px] text-cockpit-muted font-medium mb-1">Hook</p><p className="text-sm text-cockpit-text">{hook}</p></div>}
        {script && <div className="p-3 bg-cockpit-bg border border-cockpit-border rounded-xl"><p className="text-[10px] text-cockpit-muted font-medium mb-1">Roteiro</p><p className="text-sm text-cockpit-text whitespace-pre-wrap line-clamp-10 font-mono text-[13px]">{script}</p></div>}
      </div>
    )

    // SCHEDULED / PUBLISHED
    return (
      <div className="space-y-6">
        {content.publishedUrl && (
          <a href={content.publishedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-accent hover:underline p-3 bg-cockpit-bg border border-cockpit-border rounded-xl">
            <ExternalLink size={14} /> {content.publishedUrl}
          </a>
        )}
        <Field label="Anotações" value={notes} onChange={setNotes} onSave={() => save({ notes })} placeholder="Métricas, lições aprendidas..." rows={4} />
      </div>
    )
  }

  // ── Field component ───────────────────────────────────────────────────

  function Field({ label, value, onChange, onSave, placeholder, rows, mono }: {
    label: string; value: string; onChange: (v: string) => void; onSave: () => void
    placeholder: string; rows: number; mono?: boolean
  }) {
    return (
      <div>
        <p className="text-xs font-medium text-cockpit-muted mb-2">{label}</p>
        <textarea value={value} onChange={(e) => onChange(e.target.value)}
          onBlur={onSave} placeholder={placeholder} rows={rows}
          className={cn(
            "w-full px-4 py-3 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none leading-relaxed",
            mono && "font-mono text-[13px]"
          )} />
      </div>
    )
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
                <input type="text" value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => { if (title.trim() && title !== content.title) save({ title }) }}
                  className="w-full text-lg font-bold text-cockpit-text bg-transparent border-b border-transparent hover:border-cockpit-border focus:border-accent focus:outline-none py-0.5"
                />
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
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {PHASE_ORDER.filter((p) => !skill || skillPhases.some((sp) => sp.id === p)).map((p) => {
              const isActive = p === content.phase
              const isPast = PHASE_ORDER.indexOf(p) < currentIdx
              return (
                <button key={p} onClick={() => handlePhaseChange(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border",
                    isActive ? "bg-accent text-black border-accent" :
                    isPast ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                    "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}>
                  {PHASE_LABEL[p] ?? p}
                </button>
              )
            })}
          </div>
        </div>

        {/* Body — two columns on large screens */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main content area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {renderPhaseContent()}

            {/* AI Options */}
            {aiOptions && aiOptions.length > 0 && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-accent/20">
                  <p className="text-xs font-semibold text-accent flex items-center gap-1"><Sparkles size={12} /> {aiField === "hook" ? "Escolha um hook" : aiField === "title" ? "Escolha um título" : "Opções"}</p>
                  <button onClick={() => setAiOptions(null)} className="text-cockpit-muted hover:text-cockpit-text"><X size={14} /></button>
                </div>
                <div className="p-2 space-y-1.5 max-h-80 overflow-y-auto">
                  {aiOptions.map((opt: any, i: number) => (
                    <button key={i} onClick={() => selectOption(opt)}
                      className="w-full text-left p-3 rounded-xl border border-cockpit-border bg-cockpit-bg hover:border-accent/40 hover:bg-accent/5 transition-all group">
                      <p className="text-sm text-cockpit-text group-hover:text-accent font-medium">{opt.text}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {opt.style && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cockpit-border-light text-cockpit-muted">{opt.style}</span>}
                        {opt.why && <span className="text-[10px] text-cockpit-muted">{opt.why}</span>}
                      </div>
                    </button>
                  ))}
                </div>
                {/* Regenerate with consideration */}
                <div className="px-4 py-2.5 border-t border-accent/20">
                  <div className="flex items-center gap-2">
                    <input type="text" value={aiConsideration} onChange={(e) => setAiConsideration(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") regenerateWithConsideration() }}
                      placeholder="Considerações para regenerar (ex: 'mais informal', 'para público jovem')..."
                      className="flex-1 px-3 py-1.5 bg-cockpit-bg border border-cockpit-border rounded-lg text-xs text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-1 focus:ring-accent/30" />
                    <button onClick={regenerateWithConsideration} disabled={!aiConsideration.trim() || !!aiLoading}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-accent font-medium border border-accent/20 rounded-lg hover:bg-accent/10 disabled:opacity-50">
                      <RefreshCw size={11} /> Regenerar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Text Result */}
            {aiResult && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-accent/20">
                  <p className="text-xs font-semibold text-accent flex items-center gap-1"><Sparkles size={12} /> Sugestão da IA</p>
                  <button onClick={() => setAiResult(null)} className="text-cockpit-muted hover:text-cockpit-text"><X size={14} /></button>
                </div>
                <div className="px-4 py-3 text-sm text-cockpit-text whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">{aiResult}</div>
                <div className="px-4 py-2.5 border-t border-accent/20 space-y-2">
                  <div className="flex items-center gap-2">
                    {aiAction === "generate_script" && <button onClick={() => useAiResult("script")} className="text-xs text-accent font-medium hover:underline">Usar como roteiro</button>}
                    {aiAction === "generate_research" && <button onClick={() => useAiResult("research")} className="text-xs text-accent font-medium hover:underline">Usar como pesquisa</button>}
                    {aiAction === "generate_thumbnail" && <button onClick={() => useAiResult("thumbnailNotes")} className="text-xs text-accent font-medium hover:underline">Usar como notas</button>}
                    <button onClick={() => setAiResult(null)} className="text-xs text-cockpit-muted hover:text-cockpit-text ml-auto">Descartar</button>
                  </div>
                  {/* Regenerate */}
                  <div className="flex items-center gap-2">
                    <input type="text" value={aiConsideration} onChange={(e) => setAiConsideration(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") regenerateWithConsideration() }}
                      placeholder="Ajustes? (ex: 'mais curto', 'tom mais sério')..."
                      className="flex-1 px-3 py-1.5 bg-cockpit-bg border border-cockpit-border rounded-lg text-xs text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-1 focus:ring-accent/30" />
                    <button onClick={regenerateWithConsideration} disabled={!aiConsideration.trim() || !!aiLoading}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-accent font-medium border border-accent/20 rounded-lg hover:bg-accent/10 disabled:opacity-50">
                      <RefreshCw size={11} /> Regenerar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — areas, tips, notes */}
          <div className="hidden lg:flex w-72 flex-shrink-0 border-l border-cockpit-border flex-col overflow-y-auto">
            <div className="px-4 py-5 space-y-5">
              {/* Areas */}
              {areas.length > 0 && (
                <div>
                  <p className="text-[10px] text-cockpit-muted font-medium uppercase tracking-wider mb-2">Áreas</p>
                  <div className="flex flex-wrap gap-1.5">{areas.map((area) => (
                    <button key={area.id} onClick={() => handleToggleArea(area.id)} className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all",
                      localAreaIds.includes(area.id) ? "border-transparent text-white" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                    )} style={localAreaIds.includes(area.id) ? { backgroundColor: area.color } : undefined}>
                      {area.icon} {area.name}
                    </button>
                  ))}</div>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-[10px] text-cockpit-muted font-medium uppercase tracking-wider mb-2">Anotações</p>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => save({ notes: notes || null })}
                  placeholder="Notas livres..."
                  rows={4} className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-xs text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-1 focus:ring-accent/30 resize-none" />
              </div>

              {/* Tips (collapsible) */}
              {currentPhaseConfig && currentPhaseConfig.tips.length > 0 && (
                <div>
                  <button onClick={() => setShowTips(!showTips)} className="flex items-center gap-1.5 text-[10px] text-cockpit-muted font-medium uppercase tracking-wider mb-2 hover:text-cockpit-text">
                    <Lightbulb size={11} className="text-amber-500" /> Dicas ({currentPhaseConfig.tips.length})
                  </button>
                  {showTips && (
                    <div className="space-y-1.5">{currentPhaseConfig.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-1.5 px-2.5 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                        <span className="text-amber-500 text-[10px] mt-0.5">💡</span>
                        <p className="text-[10px] text-cockpit-text leading-relaxed">{tip}</p>
                      </div>
                    ))}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-cockpit-border bg-cockpit-bg/50 flex items-center justify-between flex-shrink-0">
          {prevPhase ? (
            <button onClick={() => handlePhaseChange(prevPhase)} className="flex items-center gap-1 px-3 py-2 text-xs text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl transition-colors">
              <ChevronLeft size={13} /> {PHASE_LABEL[prevPhase] ?? prevPhase}
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            {isPending && <Loader2 size={14} className="animate-spin text-cockpit-muted" />}
            <span className="text-[10px] text-cockpit-muted">Salva automaticamente</span>
          </div>
          {nextPhase ? (
            <button onClick={() => handlePhaseChange(nextPhase)}
              className="flex items-center gap-1 px-4 py-2 bg-accent text-black text-xs font-semibold rounded-xl hover:bg-accent-hover transition-colors">
              {PHASE_LABEL[nextPhase] ?? nextPhase} <ChevronRight size={13} />
            </button>
          ) : <div />}
        </div>
      </div>
    </>
  )
}
