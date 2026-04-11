"use client"

import { useMemo, useState, useTransition } from "react"
import {
  Plus, Video, Archive, X, Loader2, ChevronRight,
  Search, SlidersHorizontal, LayoutGrid, List, Zap, Film, Camera,
  ExternalLink, Lightbulb,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { createContentAction, advanceContentPhaseAction, archiveContentAction } from "@/app/actions/content.actions"
import { CONTENT_SKILLS, SKILL_LIST, type SkillId } from "@/config/content-skills"
import type { Area, ContentPhase, Platform, ContentFormat } from "@/types"
import { DatePicker } from "@/components/ui/DatePicker"
import { ContentDetailPanel } from "./ContentDetailPanel"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Content = any

const PHASE_LABEL: Record<string, string> = {
  IDEA: "Ideia", RESEARCH: "Pesquisa", SCRIPT: "Roteiro", RECORDING: "Gravação",
  EDITING: "Edição", THUMBNAIL: "Thumb/Título", REVIEW: "Revisão",
  SCHEDULED: "Agendado", PUBLISHED: "Publicado", ARCHIVED: "Arquivado",
}
const PHASE_COLOR: Record<string, string> = {
  IDEA: "bg-violet-500/15 text-violet-500 border-violet-500/20",
  RESEARCH: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  SCRIPT: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  RECORDING: "bg-red-500/15 text-red-500 border-red-500/20",
  EDITING: "bg-pink-500/15 text-pink-500 border-pink-500/20",
  THUMBNAIL: "bg-orange-500/15 text-orange-500 border-orange-500/20",
  REVIEW: "bg-cyan-500/15 text-cyan-500 border-cyan-500/20",
  SCHEDULED: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
  PUBLISHED: "bg-accent/15 text-accent-dark border-accent/20",
}
const SKILL_ICON: Record<string, string> = { SHORT_VIDEO: "⚡", LONG_VIDEO: "🎬", INSTAGRAM: "📸" }
const PIPELINE_PHASES: ContentPhase[] = ["IDEA", "RESEARCH", "SCRIPT", "RECORDING", "EDITING", "THUMBNAIL", "REVIEW", "SCHEDULED", "PUBLISHED"]

type ViewMode = "pipeline" | "list"

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

interface Props { initialContents: Content[]; areas: Area[] }

export function ConteudoClient({ initialContents, areas }: Props) {
  const [contents, setContents] = useState<Content[]>(initialContents)
  const [selectedContent, setSelectedContent] = useState<Content | null>(null)
  const [isPending, startTransition] = useTransition()
  const [viewMode, setViewMode] = useState<ViewMode>("pipeline")

  // Creation flow
  const [showCreate, setShowCreate] = useState(false)
  const [createStep, setCreateStep] = useState<"skill" | "details">("skill")
  const [selectedSkill, setSelectedSkill] = useState<SkillId | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [newHook, setNewHook] = useState("")
  const [newSeries, setNewSeries] = useState("")
  const [newPlannedDate, setNewPlannedDate] = useState("")
  const [newAreaIds, setNewAreaIds] = useState<string[]>([])
  const [newPlatform, setNewPlatform] = useState<Platform>("YOUTUBE")
  const [newFormat, setNewFormat] = useState<ContentFormat>("LONG_VIDEO")

  // Filters
  const [search, setSearch] = useState("")
  const [skillFilters, setSkillFilters] = useState<SkillId[]>([])
  const [phaseFilters, setPhaseFilters] = useState<ContentPhase[]>([])
  const [areaFilters, setAreaFilters] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const activeFilterCount = skillFilters.length + phaseFilters.length + areaFilters.length + (search ? 1 : 0)

  // ── Counts ──────────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const phase: Record<string, number> = {}
    const skill: Record<string, number> = {}
    for (const c of contents) {
      phase[c.phase] = (phase[c.phase] || 0) + 1
      if (c.skill) skill[c.skill] = (skill[c.skill] || 0) + 1
    }
    return {
      total: contents.length,
      ideas: phase["IDEA"] || 0,
      inProd: (phase["RESEARCH"] || 0) + (phase["SCRIPT"] || 0) + (phase["RECORDING"] || 0) + (phase["EDITING"] || 0) + (phase["THUMBNAIL"] || 0) + (phase["REVIEW"] || 0),
      scheduled: phase["SCHEDULED"] || 0,
      published: phase["PUBLISHED"] || 0,
      phase, skill,
    }
  }, [contents])

  // ── Filtering ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = contents
    if (search) { const q = search.toLowerCase(); result = result.filter((c: Content) => c.title.toLowerCase().includes(q) || c.series?.toLowerCase().includes(q)) }
    if (skillFilters.length > 0) result = result.filter((c: Content) => c.skill && skillFilters.includes(c.skill))
    if (phaseFilters.length > 0) result = result.filter((c: Content) => phaseFilters.includes(c.phase))
    if (areaFilters.length > 0) result = result.filter((c: Content) => {
      const cAreas = c.areas?.map((a: any) => a.area?.id ?? a.areaId).filter(Boolean) ?? (c.areaId ? [c.areaId] : [])
      return cAreas.some((id: string) => areaFilters.includes(id))
    })
    return result
  }, [contents, search, skillFilters, phaseFilters, areaFilters])

  function clearFilters() { setSearch(""); setSkillFilters([]); setPhaseFilters([]); setAreaFilters([]) }

  // ── Creation ────────────────────────────────────────────────────────────

  function resetCreate() {
    setShowCreate(false); setCreateStep("skill"); setSelectedSkill(null)
    setNewTitle(""); setNewHook(""); setNewSeries(""); setNewPlannedDate(""); setNewAreaIds([]); setNewPlatform("YOUTUBE"); setNewFormat("LONG_VIDEO")
  }

  function selectSkill(skill: SkillId) {
    setSelectedSkill(skill)
    // Auto-set platform/format
    if (skill === "SHORT_VIDEO") { setNewPlatform("TIKTOK"); setNewFormat("SHORT") }
    else if (skill === "LONG_VIDEO") { setNewPlatform("YOUTUBE"); setNewFormat("LONG_VIDEO") }
    else if (skill === "INSTAGRAM") { setNewPlatform("INSTAGRAM"); setNewFormat("POST") }
    setCreateStep("details")
  }

  function handleCreate() {
    if (!newTitle.trim()) return
    startTransition(async () => {
      const result = await createContentAction({
        title: newTitle, platform: newPlatform, format: newFormat,
        skill: selectedSkill, hook: newHook || undefined, series: newSeries || undefined,
        plannedDate: newPlannedDate ? new Date(newPlannedDate) : null,
        areaIds: newAreaIds,
      })
      if (result.success) { setContents((prev) => [result.data as Content, ...prev]); resetCreate() }
    })
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleArchive(id: string) {
    startTransition(async () => { const r = await archiveContentAction(id); if (r.success) setContents((prev) => prev.filter((c) => c.id !== id)) })
  }

  function handleUpdate(updated: Content) {
    setContents((prev) => prev.map((c) => c.id === updated.id ? updated : c))
    setSelectedContent(updated)
  }

  // ── Render content card ─────────────────────────────────────────────────

  function renderCard(c: Content, compact = false) {
    const cAreas = c.areas?.map((a: any) => a.area).filter(Boolean) ?? (c.area ? [c.area] : [])
    return (
      <div key={c.id} onClick={() => setSelectedContent(c)}
        className="cockpit-card !p-0 cursor-pointer hover:border-accent/30 transition-colors group">
        <div className="flex items-start gap-3 px-4 py-3">
          {c.skill && <span className="text-lg mt-0.5">{SKILL_ICON[c.skill] || "📝"}</span>}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-cockpit-text truncate group-hover:text-accent transition-colors">{c.title}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", PHASE_COLOR[c.phase] || "")}>
                {PHASE_LABEL[c.phase] || c.phase}
              </span>
              {c.series && <span className="text-[10px] text-cockpit-muted">📂 {c.series}</span>}
              {c.plannedDate && <span className="text-[10px] text-cockpit-muted">{formatDate(c.plannedDate)}</span>}
              {cAreas.slice(0, 2).map((a: any) => (
                <span key={a.id} className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: a.color }}>{a.icon}</span>
              ))}
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); handleArchive(c.id) }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-all">
            <Archive size={14} />
          </button>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cockpit-text">Conteúdo</h1>
            <p className="text-sm text-cockpit-muted mt-1">Pipeline de produção · {counts.total} itens</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors">
            <Plus size={16} /> Novo Conteúdo
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <button onClick={() => { clearFilters(); setPhaseFilters(["IDEA"]) }} className={cn("cockpit-card !py-3 text-left hover:border-violet-500/30 transition-colors", phaseFilters.length === 1 && phaseFilters[0] === "IDEA" && "!border-violet-500/40")}>
            <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider flex items-center gap-1"><Lightbulb size={10} /> Ideias</p>
            <p className="text-2xl font-bold text-violet-400 mt-1">{counts.ideas}</p>
          </button>
          <button onClick={() => { clearFilters(); setPhaseFilters(["RESEARCH", "SCRIPT", "RECORDING", "EDITING", "THUMBNAIL", "REVIEW"] as ContentPhase[]) }} className="cockpit-card !py-3 text-left hover:border-amber-500/30 transition-colors">
            <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Em produção</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{counts.inProd}</p>
          </button>
          <button onClick={() => { clearFilters(); setPhaseFilters(["SCHEDULED"]) }} className="cockpit-card !py-3 text-left hover:border-emerald-500/30 transition-colors">
            <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Agendados</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{counts.scheduled}</p>
          </button>
          <button onClick={() => { clearFilters(); setPhaseFilters(["PUBLISHED"]) }} className="cockpit-card !py-3 text-left hover:border-accent/30 transition-colors">
            <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Publicados</p>
            <p className="text-2xl font-bold text-accent mt-1">{counts.published}</p>
          </button>
          {SKILL_LIST.map((s) => (
            <button key={s.id} onClick={() => { clearFilters(); setSkillFilters([s.id]) }} className={cn("cockpit-card !py-3 text-left hover:border-cockpit-text/20 transition-colors", skillFilters.length === 1 && skillFilters[0] === s.id && "!border-accent/40")}>
              <p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">{s.icon} {s.label}</p>
              <p className="text-2xl font-bold text-cockpit-text mt-1">{counts.skill[s.id] || 0}</p>
            </button>
          ))}
        </div>

        {/* Search + filters + view mode */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cockpit-muted" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conteúdo..."
              className="w-full pl-9 pr-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <button onClick={() => setShowFilters((f) => !f)} className={cn(
            "flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm transition-colors",
            showFilters || activeFilterCount > 0 ? "bg-accent/10 border-accent/30 text-accent" : "bg-cockpit-bg border-cockpit-border text-cockpit-muted hover:text-cockpit-text"
          )}>
            <SlidersHorizontal size={15} /> Filtros{activeFilterCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 bg-accent text-black text-[10px] font-bold rounded-full">{activeFilterCount}</span>}
          </button>
          <div className="flex bg-cockpit-border-light rounded-xl p-0.5">
            <button onClick={() => setViewMode("pipeline")} className={cn("p-2 rounded-lg transition-colors", viewMode === "pipeline" ? "bg-cockpit-surface text-cockpit-text shadow-sm" : "text-cockpit-muted")}><LayoutGrid size={15} /></button>
            <button onClick={() => setViewMode("list")} className={cn("p-2 rounded-lg transition-colors", viewMode === "list" ? "bg-cockpit-surface text-cockpit-text shadow-sm" : "text-cockpit-muted")}><List size={15} /></button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="cockpit-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider">Filtros avançados</h3>
              {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-cockpit-muted hover:text-red-400">Limpar</button>}
            </div>
            <div>
              <p className="text-[11px] text-cockpit-muted font-medium mb-2">Skill</p>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_LIST.map((s) => (
                  <button key={s.id} onClick={() => setSkillFilters((f) => toggle(f, s.id))} className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    skillFilters.includes(s.id) ? "border-accent/40 bg-accent/10 text-accent" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}>{s.icon} {s.label} <span className="text-[10px] opacity-60">{counts.skill[s.id] || 0}</span></button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-cockpit-muted font-medium mb-2">Fase</p>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_PHASES.map((p) => (
                  <button key={p} onClick={() => setPhaseFilters((f) => toggle(f, p))} className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    phaseFilters.includes(p) ? PHASE_COLOR[p] + " border-current" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}>{PHASE_LABEL[p]} <span className="text-[10px] opacity-60">{counts.phase[p] || 0}</span></button>
                ))}
              </div>
            </div>
            {areas.length > 0 && (
              <div>
                <p className="text-[11px] text-cockpit-muted font-medium mb-2">Áreas</p>
                <div className="flex flex-wrap gap-1.5">
                  {areas.map((a) => (
                    <button key={a.id} onClick={() => setAreaFilters((f) => toggle(f, a.id))} className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      areaFilters.includes(a.id) ? "border-transparent text-white" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                    )} style={areaFilters.includes(a.id) ? { backgroundColor: a.color } : undefined}>{a.icon} {a.name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active filter tags */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-cockpit-muted mr-1">Filtros:</span>
            {skillFilters.map((s) => <span key={s} className="flex items-center gap-1 px-2 py-1 bg-cockpit-surface border border-cockpit-border rounded-lg text-[11px] text-cockpit-text">{SKILL_ICON[s]} {CONTENT_SKILLS[s].label} <button onClick={() => setSkillFilters((f) => f.filter((v) => v !== s))} className="text-cockpit-muted hover:text-red-400"><X size={10} /></button></span>)}
            {phaseFilters.map((p) => <span key={p} className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border", PHASE_COLOR[p])}>{PHASE_LABEL[p]} <button onClick={() => setPhaseFilters((f) => f.filter((v) => v !== p))} className="opacity-60 hover:opacity-100"><X size={10} /></button></span>)}
            {areaFilters.map((id) => { const a = areas.find((x) => x.id === id); if (!a) return null; return <span key={id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-white" style={{ backgroundColor: a.color }}>{a.icon} {a.name} <button onClick={() => setAreaFilters((f) => f.filter((v) => v !== id))} className="opacity-70 hover:opacity-100"><X size={10} /></button></span> })}
            <button onClick={clearFilters} className="text-[11px] text-cockpit-muted hover:text-red-400 ml-1">Limpar</button>
          </div>
        )}

        {/* ── CREATION FLOW ── */}
        {showCreate && (
          <div className="cockpit-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-cockpit-text">
                {createStep === "skill" ? "Escolha o tipo de conteúdo" : `Novo ${CONTENT_SKILLS[selectedSkill!].label}`}
              </h2>
              <button onClick={resetCreate} className="p-1 text-cockpit-muted hover:text-cockpit-text rounded-lg"><X size={16} /></button>
            </div>

            {createStep === "skill" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SKILL_LIST.map((s) => (
                  <button key={s.id} onClick={() => selectSkill(s.id)}
                    className="cockpit-card !p-4 text-left hover:border-accent/40 transition-colors group">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{s.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-cockpit-text group-hover:text-accent">{s.label}</p>
                        <p className="text-[10px] text-cockpit-muted">{s.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.phases.slice(0, 5).map((p) => (
                        <span key={p.id} className="text-[9px] px-1.5 py-0.5 bg-cockpit-border-light rounded text-cockpit-muted">{p.label}</span>
                      ))}
                      {s.phases.length > 5 && <span className="text-[9px] text-cockpit-muted">+{s.phases.length - 5}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {createStep === "details" && selectedSkill && (
              <div className="space-y-4">
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título / Ideia do conteúdo *"
                  className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" autoFocus />
                <textarea value={newHook} onChange={(e) => setNewHook(e.target.value)} placeholder="Hook / Gancho (opcional)"
                  rows={2} className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><label className="block text-xs text-cockpit-muted mb-1.5">Série (opcional)</label><input type="text" value={newSeries} onChange={(e) => setNewSeries(e.target.value)} placeholder="Ex: Dicas semanais" className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
                  <div><label className="block text-xs text-cockpit-muted mb-1.5">Data planejada</label><DatePicker value={newPlannedDate} onChange={setNewPlannedDate} /></div>
                  <div><label className="block text-xs text-cockpit-muted mb-1.5">Plataforma</label><select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value as Platform)} className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"><option value="YOUTUBE">YouTube</option><option value="INSTAGRAM">Instagram</option><option value="TIKTOK">TikTok</option><option value="TWITCH">Twitch</option><option value="OTHER">Outro</option></select></div>
                </div>
                {areas.length > 0 && (
                  <div>
                    <label className="block text-xs text-cockpit-muted mb-1.5">Áreas</label>
                    <div className="flex flex-wrap gap-1.5">{areas.map((a) => (
                      <button key={a.id} type="button" onClick={() => setNewAreaIds((prev) => prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id])}
                        className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all", newAreaIds.includes(a.id) ? "border-transparent text-white" : "border-cockpit-border text-cockpit-muted")}
                        style={newAreaIds.includes(a.id) ? { backgroundColor: a.color } : {}}>{a.icon} {a.name}</button>
                    ))}</div>
                  </div>
                )}

                {/* Skill tips for ideation */}
                {CONTENT_SKILLS[selectedSkill].phases[0]?.tips && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                    <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1.5">💡 Dicas para ideação</p>
                    <ul className="space-y-1">
                      {CONTENT_SKILLS[selectedSkill].phases[0].tips.slice(0, 3).map((tip, i) => (
                        <li key={i} className="text-[11px] text-cockpit-text">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button onClick={() => setCreateStep("skill")} className="px-4 py-2 text-sm text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl">Voltar</button>
                  <button onClick={handleCreate} disabled={!newTitle.trim() || isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover disabled:opacity-50">
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Criar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PIPELINE VIEW ── */}
        {viewMode === "pipeline" && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {PIPELINE_PHASES.map((phase) => {
                const items = filtered.filter((c: Content) => c.phase === phase)
                return (
                  <div key={phase} className="w-64 flex-shrink-0">
                    <div className={cn("flex items-center justify-between mb-3 px-2")}>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", PHASE_COLOR[phase])}>
                          {PHASE_LABEL[phase]}
                        </span>
                        <span className="text-[10px] text-cockpit-muted">{items.length}</span>
                      </div>
                    </div>
                    <div className="space-y-2 min-h-[100px]">
                      {items.length === 0 ? (
                        <div className="h-20 border-2 border-dashed border-cockpit-border rounded-xl flex items-center justify-center">
                          <p className="text-[10px] text-cockpit-muted">Vazio</p>
                        </div>
                      ) : items.map((c: Content) => renderCard(c, true))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {viewMode === "list" && (
          <div className="space-y-2">
            <p className="text-xs text-cockpit-muted">{filtered.length} conteúdo{filtered.length !== 1 ? "s" : ""}</p>
            {filtered.length === 0 ? (
              <div className="cockpit-card flex flex-col items-center justify-center py-16 text-cockpit-muted">
                <Video size={32} strokeWidth={1} />
                <p className="text-sm mt-3">{activeFilterCount > 0 ? "Nenhum conteúdo com esses filtros" : "Nenhum conteúdo"}</p>
                {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-accent mt-2 hover:underline">Limpar filtros</button>}
              </div>
            ) : filtered.map((c: Content) => renderCard(c))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedContent && (
        <ContentDetailPanel
          content={selectedContent}
          areas={areas}
          onClose={() => setSelectedContent(null)}
          onUpdate={handleUpdate}
          onArchive={handleArchive}
        />
      )}
    </>
  )
}
