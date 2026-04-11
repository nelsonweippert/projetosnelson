"use client"

import { useCallback, useState, useTransition } from "react"
import {
  X, Save, Loader2, Archive, ChevronRight, ChevronLeft,
  CheckSquare, Lightbulb, FileText, Tag, ExternalLink, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateContentAction, advanceContentPhaseAction, archiveContentAction } from "@/app/actions/content.actions"
import { CONTENT_SKILLS, type SkillId, type PhaseConfig } from "@/config/content-skills"
import type { Area, ContentPhase } from "@/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Content = any

const PHASE_ORDER: ContentPhase[] = ["IDEA", "RESEARCH", "SCRIPT", "RECORDING", "EDITING", "THUMBNAIL", "REVIEW", "SCHEDULED", "PUBLISHED"]

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

  // Editable fields
  const [title, setTitle] = useState(content.title)
  const [titleChanged, setTitleChanged] = useState(false)
  const [hook, setHook] = useState(content.hook ?? "")
  const [hookChanged, setHookChanged] = useState(false)
  const [script, setScript] = useState(content.script ?? "")
  const [scriptChanged, setScriptChanged] = useState(false)
  const [research, setResearch] = useState(content.research ?? "")
  const [researchChanged, setResearchChanged] = useState(false)
  const [thumbnailNotes, setThumbnailNotes] = useState(content.thumbnailNotes ?? "")
  const [thumbChanged, setThumbChanged] = useState(false)
  const [notes, setNotes] = useState(content.notes ?? "")
  const [notesChanged, setNotesChanged] = useState(false)
  const [localAreaIds, setLocalAreaIds] = useState<string[]>(
    content.areas?.map((a: any) => a.area?.id ?? a.areaId).filter(Boolean) ?? (content.areaId ? [content.areaId] : [])
  )
  const [checklist, setChecklist] = useState<Record<string, boolean>>(content.checklist ?? {})

  // AI
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiOptions, setAiOptions] = useState<any[] | null>(null)
  const [aiField, setAiField] = useState<string | null>(null)
  const [aiAction, setAiAction] = useState<string | null>(null)

  const hasChanges = titleChanged || hookChanged || scriptChanged || researchChanged || thumbChanged || notesChanged

  const callAI = useCallback(async (action: string) => {
    setAiLoading(action); setAiResult(null); setAiOptions(null); setAiAction(action); setAiField(null)
    try {
      const res = await fetch("/api/content/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action, skill: content.skill, phase: content.phase,
          title: content.title, hook, script, notes, research,
          series: content.series,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.type === "options" && data.options) {
          setAiOptions(data.options)
          setAiField(data.field)
        } else {
          setAiResult(data.result)
        }
      } else {
        setAiResult("Erro ao gerar sugestão. Verifique a ANTHROPIC_API_KEY.")
      }
    } catch { setAiResult("Erro de conexão.") }
    setAiLoading(null)
  }, [content.skill, content.phase, content.title, hook, script, notes, research, content.series])

  function selectOption(option: any) {
    if (aiField === "hook") {
      setHook(option.text); setHookChanged(true)
      save({ hook: option.text })
    } else if (aiField === "title") {
      setTitle(option.text); setTitleChanged(true)
      save({ title: option.text })
    }
    setAiOptions(null); setAiField(null)
  }

  function save(data: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateContentAction(content.id, data)
      if (result.success) onUpdate(result.data as Content)
    })
  }

  function handleSaveAll() {
    const data: Record<string, unknown> = {}
    if (titleChanged) data.title = title
    if (hookChanged) data.hook = hook || null
    if (scriptChanged) data.script = script || null
    if (researchChanged) data.research = research || null
    if (thumbChanged) data.thumbnailNotes = thumbnailNotes || null
    if (notesChanged) data.notes = notes || null
    if (Object.keys(data).length > 0) save(data)
    setTitleChanged(false); setHookChanged(false); setScriptChanged(false)
    setResearchChanged(false); setThumbChanged(false); setNotesChanged(false)
  }

  function handleToggleArea(areaId: string) {
    const next = localAreaIds.includes(areaId) ? localAreaIds.filter((id) => id !== areaId) : [...localAreaIds, areaId]
    setLocalAreaIds(next)
    save({ areaIds: next })
  }

  function handleChecklistToggle(key: string) {
    const next = { ...checklist, [key]: !checklist[key] }
    setChecklist(next)
    save({ checklist: next })
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

  // Phase navigation
  const currentIdx = PHASE_ORDER.indexOf(content.phase)
  const prevPhase = currentIdx > 0 ? PHASE_ORDER[currentIdx - 1] : null
  const nextPhase = currentIdx < PHASE_ORDER.length - 1 ? PHASE_ORDER[currentIdx + 1] : null

  // Checklist progress
  const checklistItems = currentPhaseConfig?.checklist ?? []
  const checkedCount = checklistItems.filter((item) => checklist[`${content.phase}_${item.label}`]).length
  const totalChecklist = checklistItems.length

  function AiButton({ action, label }: { action: string; label: string }) {
    return (
      <button onClick={() => callAI(action)} disabled={!!aiLoading}
        className={cn("flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all",
          aiLoading === action ? "bg-accent/10 border-accent/30 text-accent" : "border-cockpit-border text-cockpit-muted hover:border-accent/30 hover:text-accent"
        )}>
        {aiLoading === action ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} {label}
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-xl z-50 bg-cockpit-surface border-l border-cockpit-border shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-cockpit-border">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2">
                {skill && <span className="text-lg">{skill.icon}</span>}
                <input type="text" value={title}
                  onChange={(e) => { setTitle(e.target.value); setTitleChanged(true) }}
                  onBlur={() => { if (titleChanged && title.trim()) { save({ title }); setTitleChanged(false) } }}
                  className="w-full text-base font-semibold text-cockpit-text bg-transparent border-b border-transparent hover:border-cockpit-border focus:border-accent focus:outline-none py-0.5"
                />
              </div>
              {skill && <p className="text-[11px] text-cockpit-muted mt-1">{skill.label} · {skill.description}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={handleArchive} className="p-2 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10"><Archive size={15} /></button>
              <button onClick={onClose} className="p-2 text-cockpit-muted hover:text-cockpit-text rounded-lg hover:bg-cockpit-surface-hover"><X size={15} /></button>
            </div>
          </div>

          {/* Phase stepper */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
            {PHASE_ORDER.filter((p) => {
              if (!skill) return true
              return skillPhases.some((sp) => sp.id === p)
            }).map((p, i) => {
              const isActive = p === content.phase
              const isPast = PHASE_ORDER.indexOf(p) < currentIdx
              return (
                <button key={p} onClick={() => handlePhaseChange(p)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all border",
                    isActive ? "bg-accent text-black border-accent" :
                    isPast ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                    "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}>
                  {currentPhaseConfig && p === content.phase ? currentPhaseConfig.label :
                   skillPhases.find((sp) => sp.id === p)?.label ?? p}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Phase info + checklist */}
          {currentPhaseConfig && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare size={13} className="text-accent" /> Checklist — {currentPhaseConfig.label}
                  </h3>
                  {totalChecklist > 0 && (
                    <span className="text-[10px] text-cockpit-muted">{checkedCount}/{totalChecklist}</span>
                  )}
                </div>
                {totalChecklist > 0 && (
                  <div className="w-full h-1.5 bg-cockpit-border-light rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${totalChecklist > 0 ? (checkedCount / totalChecklist) * 100 : 0}%` }} />
                  </div>
                )}
                <div className="space-y-1">
                  {checklistItems.map((item) => {
                    const key = `${content.phase}_${item.label}`
                    return (
                      <label key={key} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-cockpit-surface-hover transition-colors cursor-pointer group">
                        <input type="checkbox" checked={!!checklist[key]} onChange={() => handleChecklistToggle(key)}
                          className="w-4 h-4 accent-accent rounded mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className={cn("text-sm", checklist[key] ? "line-through text-cockpit-muted" : "text-cockpit-text")}>{item.label}</span>
                          {item.tip && <p className="text-[10px] text-cockpit-muted mt-0.5">{item.tip}</p>}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Tips */}
              {currentPhaseConfig.tips.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Lightbulb size={13} className="text-amber-500" /> Dicas
                  </h3>
                  <div className="space-y-1.5">
                    {currentPhaseConfig.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0 text-xs">💡</span>
                        <p className="text-xs text-cockpit-text">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hook */}
          {(content.phase === "IDEA" || content.phase === "SCRIPT") && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-cockpit-muted">Hook (gancho)</p>
                <div className="flex items-center gap-2">
                  <AiButton action="generate_hook" label="Gerar hooks" />
                  {hookChanged && <button onClick={() => { save({ hook: hook || null }); setHookChanged(false) }} className="text-xs text-accent-dark hover:text-accent flex items-center gap-1"><Save size={11} /> Salvar</button>}
                </div>
              </div>
              <textarea value={hook} onChange={(e) => { setHook(e.target.value); setHookChanged(true) }}
                placeholder="Qual é o gancho dos primeiros segundos?"
                rows={2} className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
            </div>
          )}

          {/* Research */}
          {(content.phase === "RESEARCH" || content.phase === "IDEA") && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-cockpit-muted">Pesquisa / Referências</p>
                <div className="flex items-center gap-2">
                  <AiButton action="generate_research" label="Sugerir pesquisa" />
                  {researchChanged && <button onClick={() => { save({ research: research || null }); setResearchChanged(false) }} className="text-xs text-accent-dark hover:text-accent flex items-center gap-1"><Save size={11} /> Salvar</button>}
                </div>
              </div>
              <textarea value={research} onChange={(e) => { setResearch(e.target.value); setResearchChanged(true) }}
                placeholder="Links, dados, fontes, notas de pesquisa..."
                rows={4} className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
            </div>
          )}

          {/* Script */}
          {(content.phase === "SCRIPT" || content.phase === "RECORDING") && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-cockpit-muted flex items-center gap-1"><FileText size={12} /> Roteiro</p>
                <div className="flex items-center gap-2">
                  <AiButton action="generate_script" label="Gerar roteiro" />
                  <AiButton action="generate_titles" label="Gerar títulos" />
                  {scriptChanged && <button onClick={() => { save({ script: script || null }); setScriptChanged(false) }} className="text-xs text-accent-dark hover:text-accent flex items-center gap-1"><Save size={11} /> Salvar</button>}
                </div>
              </div>
              <textarea value={script} onChange={(e) => { setScript(e.target.value); setScriptChanged(true) }}
                placeholder="Escreva o roteiro completo aqui..."
                rows={10} className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none font-mono text-[13px] leading-relaxed" />

              {/* Script templates */}
              {skill && skill.scriptTemplates.length > 0 && !script && (
                <div className="mt-3">
                  <p className="text-[10px] text-cockpit-muted font-medium mb-2">Templates de roteiro:</p>
                  <div className="space-y-2">
                    {skill.scriptTemplates.map((tmpl) => (
                      <button key={tmpl.name} onClick={() => { setScript(tmpl.structure.join("\n\n")); setScriptChanged(true) }}
                        className="w-full text-left p-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl hover:border-accent/30 transition-colors">
                        <p className="text-xs font-medium text-cockpit-text">{tmpl.name}</p>
                        <p className="text-[10px] text-cockpit-muted mt-0.5 line-clamp-2">{tmpl.structure.join(" → ")}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Thumbnail notes */}
          {content.phase === "THUMBNAIL" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-cockpit-muted">Thumbnail & Título</p>
                <div className="flex items-center gap-2">
                  <AiButton action="generate_thumbnail" label="Gerar arte" />
                  {thumbChanged && <button onClick={() => { save({ thumbnailNotes: thumbnailNotes || null }); setThumbChanged(false) }} className="text-xs text-accent-dark hover:text-accent flex items-center gap-1"><Save size={11} /> Salvar</button>}
                </div>
              </div>
              <textarea value={thumbnailNotes} onChange={(e) => { setThumbnailNotes(e.target.value); setThumbChanged(true) }}
                placeholder="Notas da thumbnail: expressão facial, texto, cores, composição..."
                rows={4} className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
            </div>
          )}

          {/* AI Review button */}
          {content.phase === "REVIEW" && (
            <div className="flex justify-center">
              <button onClick={() => callAI("review")} disabled={!!aiLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 text-accent text-xs font-semibold border border-accent/20 rounded-xl hover:bg-accent/20 transition-colors disabled:opacity-50">
                {aiLoading === "review" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Revisar conteúdo com IA
              </button>
            </div>
          )}

          {/* AI Options (selectable cards) */}
          {aiOptions && aiOptions.length > 0 && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-accent/20">
                <p className="text-[11px] font-semibold text-accent flex items-center gap-1">
                  <Sparkles size={12} />
                  {aiField === "hook" ? "Escolha um hook" : aiField === "title" ? "Escolha um título" : "Opções geradas"}
                </p>
                <button onClick={() => { setAiOptions(null); setAiField(null) }} className="text-cockpit-muted hover:text-cockpit-text"><X size={13} /></button>
              </div>
              <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto">
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
            </div>
          )}

          {/* AI Text Result (for script, research, thumbnail, review) */}
          {aiResult && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-accent/20">
                <p className="text-[11px] font-semibold text-accent flex items-center gap-1"><Sparkles size={12} /> Sugestão da IA</p>
                <button onClick={() => { setAiResult(null); setAiAction(null) }} className="text-cockpit-muted hover:text-cockpit-text"><X size={13} /></button>
              </div>
              <div className="px-4 py-3 text-sm text-cockpit-text whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{aiResult}</div>
              <div className="flex items-center gap-2 px-4 py-2 border-t border-accent/20">
                {aiAction === "generate_script" && (
                  <button onClick={() => { setScript(aiResult); setScriptChanged(true); setAiResult(null) }}
                    className="text-[11px] text-accent font-medium hover:underline">Usar como roteiro</button>
                )}
                {aiAction === "generate_research" && (
                  <button onClick={() => { setResearch(aiResult); setResearchChanged(true); setAiResult(null) }}
                    className="text-[11px] text-accent font-medium hover:underline">Usar como pesquisa</button>
                )}
                {aiAction === "generate_thumbnail" && (
                  <button onClick={() => { setThumbnailNotes(aiResult); setThumbChanged(true); setAiResult(null) }}
                    className="text-[11px] text-accent font-medium hover:underline">Usar como notas de arte</button>
                )}
                <button onClick={() => { setAiResult(null); setAiAction(null) }}
                  className="text-[11px] text-cockpit-muted hover:text-cockpit-text ml-auto">Descartar</button>
              </div>
            </div>
          )}

          {/* Notes (always visible) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-cockpit-muted">Anotações</p>
              {notesChanged && <button onClick={() => { save({ notes: notes || null }); setNotesChanged(false) }} className="text-xs text-accent-dark hover:text-accent flex items-center gap-1"><Save size={11} /> Salvar</button>}
            </div>
            <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setNotesChanged(true) }}
              placeholder="Anotações livres..."
              rows={3} className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
          </div>

          {/* Areas */}
          {areas.length > 0 && (
            <div>
              <p className="text-xs text-cockpit-muted mb-2 font-medium">Áreas</p>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((area) => (
                  <button key={area.id} onClick={() => handleToggleArea(area.id)} className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    localAreaIds.includes(area.id) ? "border-transparent text-white" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )} style={localAreaIds.includes(area.id) ? { backgroundColor: area.color } : undefined}>
                    {area.icon} {area.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Published URL */}
          {content.phase === "PUBLISHED" && content.publishedUrl && (
            <a href={content.publishedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-accent hover:underline">
              <ExternalLink size={12} /> {content.publishedUrl}
            </a>
          )}
        </div>

        {/* Footer — phase navigation + save */}
        <div className="px-6 py-4 border-t border-cockpit-border bg-cockpit-bg/50 space-y-3">
          {hasChanges && (
            <button onClick={handleSaveAll} disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover disabled:opacity-50">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar alterações
            </button>
          )}
          <div className="flex items-center justify-between gap-2">
            {prevPhase ? (
              <button onClick={() => handlePhaseChange(prevPhase)} className="flex items-center gap-1 px-3 py-2 text-xs text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl transition-colors">
                <ChevronLeft size={13} /> Voltar fase
              </button>
            ) : <div />}
            {nextPhase && (
              <button onClick={() => handlePhaseChange(nextPhase)}
                className="flex items-center gap-1 px-4 py-2 bg-accent/10 text-accent text-xs font-semibold border border-accent/20 rounded-xl hover:bg-accent/20 transition-colors">
                Avançar para {skillPhases.find((p) => p.id === nextPhase)?.label ?? nextPhase} <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
