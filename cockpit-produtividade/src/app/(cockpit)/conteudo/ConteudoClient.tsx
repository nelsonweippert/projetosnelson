"use client"

import { useState, useTransition } from "react"
import { Plus, Video, Archive, X, Loader2, ChevronRight, ExternalLink } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { createContentAction, advanceContentPhaseAction, archiveContentAction } from "@/app/actions/content.actions"
import type { Area, ContentPhase, Platform, ContentFormat } from "@/types"
import { DatePicker } from "@/components/ui/DatePicker"

type Content = {
  id: string
  title: string
  platform: Platform
  format: ContentFormat
  phase: ContentPhase
  hook?: string | null
  series?: string | null
  plannedDate?: Date | string | null
  publishedUrl?: string | null
  area?: { id: string; name: string; color: string; icon: string } | null
}

const PHASES: ContentPhase[] = ["IDEA", "SCRIPT", "RECORDING", "EDITING", "REVIEW", "SCHEDULED", "PUBLISHED"]

const PHASE_LABEL: Record<ContentPhase, string> = {
  IDEA: "💡 Ideia",
  SCRIPT: "✍️ Roteiro",
  RECORDING: "🎙️ Gravação",
  EDITING: "✂️ Edição",
  REVIEW: "👁️ Revisão",
  SCHEDULED: "📅 Agendado",
  PUBLISHED: "✅ Publicado",
  ARCHIVED: "🗃️ Arquivado",
}

const PHASE_COLOR: Record<ContentPhase, string> = {
  IDEA: "bg-blue-500/10 text-blue-500",
  SCRIPT: "bg-purple-500/10 text-purple-500",
  RECORDING: "bg-orange-500/10 text-orange-500",
  EDITING: "bg-amber-500/10 text-amber-600",
  REVIEW: "bg-yellow-500/10 text-yellow-600",
  SCHEDULED: "bg-cyan-500/10 text-cyan-600",
  PUBLISHED: "bg-emerald-500/10 text-emerald-600",
  ARCHIVED: "bg-cockpit-border-light text-cockpit-muted",
}

const PLATFORM_LABEL: Record<Platform, string> = {
  YOUTUBE: "YT",
  INSTAGRAM: "IG",
  TIKTOK: "TK",
  TWITCH: "TW",
  OTHER: "—",
}

const FORMAT_LABEL: Record<ContentFormat, string> = {
  LONG_VIDEO: "Vídeo longo",
  SHORT: "Short",
  REELS: "Reels",
  POST: "Post",
  LIVE: "Live",
  THREAD: "Thread",
}

const NEXT_PHASE: Partial<Record<ContentPhase, ContentPhase>> = {
  IDEA: "SCRIPT",
  SCRIPT: "RECORDING",
  RECORDING: "EDITING",
  EDITING: "REVIEW",
  REVIEW: "SCHEDULED",
  SCHEDULED: "PUBLISHED",
}

interface Props {
  initialContents: Content[]
  areas: Area[]
}

export function ConteudoClient({ initialContents, areas }: Props) {
  const [contents, setContents] = useState<Content[]>(initialContents)
  const [filterPhase, setFilterPhase] = useState<ContentPhase | "ALL">("ALL")
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState("")
  const [platform, setPlatform] = useState<Platform>("YOUTUBE")
  const [format, setFormat] = useState<ContentFormat>("LONG_VIDEO")
  const [hook, setHook] = useState("")
  const [series, setSeries] = useState("")
  const [plannedDate, setPlannedDate] = useState("")
  const [areaId, setAreaId] = useState("")

  const activePhases = PHASES.filter((p) => p !== "ARCHIVED")

  const filtered = filterPhase === "ALL"
    ? contents.filter((c) => c.phase !== "ARCHIVED")
    : contents.filter((c) => c.phase === filterPhase)

  const phaseCounts = PHASES.reduce((acc, p) => {
    acc[p] = contents.filter((c) => c.phase === p).length
    return acc
  }, {} as Record<ContentPhase, number>)

  function resetForm() {
    setTitle(""); setPlatform("YOUTUBE"); setFormat("LONG_VIDEO")
    setHook(""); setSeries(""); setPlannedDate(""); setAreaId("")
    setShowForm(false)
  }

  function handleCreate() {
    if (!title.trim()) return
    startTransition(async () => {
      const result = await createContentAction({
        title,
        platform,
        format,
        hook: hook || undefined,
        series: series || undefined,
        plannedDate: plannedDate ? new Date(plannedDate) : null,
        areaId: areaId || null,
      })
      if (result.success) {
        setContents((prev) => [result.data as Content, ...prev])
        resetForm()
      }
    })
  }

  function handleAdvancePhase(content: Content) {
    const next = NEXT_PHASE[content.phase]
    if (!next) return
    startTransition(async () => {
      const result = await advanceContentPhaseAction(content.id, next)
      if (result.success) {
        setContents((prev) => prev.map((c) => c.id === content.id ? { ...c, phase: next } : c))
      }
    })
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveContentAction(id)
      if (result.success) setContents((prev) => prev.filter((c) => c.id !== id))
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text">Conteúdo</h1>
          <p className="text-sm text-cockpit-muted mt-1">Pipeline de produção · {contents.filter((c) => c.phase !== "ARCHIVED").length} itens</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors">
          <Plus size={16} /> Nova Ideia
        </button>
      </div>

      {/* Pipeline summary */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {activePhases.map((phase) => (
          <button key={phase} onClick={() => setFilterPhase(filterPhase === phase ? "ALL" : phase)}
            className={cn(
              "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
              filterPhase === phase
                ? "border-transparent " + PHASE_COLOR[phase]
                : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
            )}>
            {PHASE_LABEL[phase]}
            {phaseCounts[phase] > 0 && (
              <span className="w-4 h-4 rounded-full bg-cockpit-border-light text-cockpit-text flex items-center justify-center text-[10px] font-bold">
                {phaseCounts[phase]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="cockpit-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cockpit-text">Nova Ideia de Conteúdo</h2>
            <button onClick={resetForm} className="p-1 text-cockpit-muted hover:text-cockpit-text rounded-lg">
              <X size={16} />
            </button>
          </div>

          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do conteúdo *"
            className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />

          <input type="text" value={hook} onChange={(e) => setHook(e.target.value)}
            placeholder="Hook / chamada (opcional)"
            className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Plataforma</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="YOUTUBE">YouTube</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="TIKTOK">TikTok</option>
                <option value="TWITCH">Twitch</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Formato</label>
              <select value={format} onChange={(e) => setFormat(e.target.value as ContentFormat)}
                className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="LONG_VIDEO">Vídeo longo</option>
                <option value="SHORT">Short</option>
                <option value="REELS">Reels</option>
                <option value="POST">Post</option>
                <option value="LIVE">Live</option>
                <option value="THREAD">Thread</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Data planejada</label>
              <DatePicker value={plannedDate} onChange={setPlannedDate} />
            </div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Área</label>
              <select value={areaId} onChange={(e) => setAreaId(e.target.value)}
                className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="">Nenhuma</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
            </div>
          </div>

          <input type="text" value={series} onChange={(e) => setSeries(e.target.value)}
            placeholder="Série (opcional)"
            className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />

          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl transition-colors">
              Cancelar
            </button>
            <button onClick={handleCreate} disabled={!title.trim() || isPending}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Criar
            </button>
          </div>
        </div>
      )}

      {/* Content List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="cockpit-card flex flex-col items-center justify-center py-16 text-cockpit-muted">
            <Video size={32} strokeWidth={1} />
            <p className="text-sm mt-3">Nenhum conteúdo encontrado</p>
          </div>
        ) : (
          filtered.map((content) => (
            <div key={content.id} className="cockpit-card group">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-sm font-medium text-cockpit-text line-clamp-1">{content.title}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", PHASE_COLOR[content.phase])}>
                      {PHASE_LABEL[content.phase]}
                    </span>
                    <span className="text-[10px] text-cockpit-muted">{PLATFORM_LABEL[content.platform]}</span>
                    <span className="text-[10px] text-cockpit-muted">{FORMAT_LABEL[content.format]}</span>
                    {content.series && <span className="text-[10px] text-cockpit-muted">· {content.series}</span>}
                    {content.plannedDate && (
                      <span className="text-[10px] text-cockpit-muted bg-cockpit-border-light px-1.5 py-0.5 rounded-full">
                        📅 {formatDate(content.plannedDate)}
                      </span>
                    )}
                    {content.area && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: content.area.color }}>
                        {content.area.icon} {content.area.name}
                      </span>
                    )}
                    {content.hook && (
                      <span className="text-[10px] text-cockpit-muted italic line-clamp-1">"{content.hook}"</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {content.publishedUrl && (
                    <a href={content.publishedUrl} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-cockpit-muted hover:text-accent rounded-lg hover:bg-accent/10 transition-colors">
                      <ExternalLink size={13} />
                    </a>
                  )}
                  {NEXT_PHASE[content.phase] && (
                    <button onClick={() => handleAdvancePhase(content)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-cockpit-muted hover:text-accent border border-cockpit-border hover:border-accent/40 rounded-lg transition-all">
                      Avançar <ChevronRight size={11} />
                    </button>
                  )}
                  <button onClick={() => handleArchive(content.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-all">
                    <Archive size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
