"use client"

import { useState, useTransition, useRef } from "react"
import {
  X, Save, Loader2, Archive, ExternalLink, BookOpen,
  CheckCircle, Circle, BookMarked, Plus, Link, FileText, Tag, Paperclip, Highlighter,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateReferenceAction, archiveReferenceAction } from "@/app/actions/reference.actions"
import type { Area, ReferenceStatus, ReferenceType, ReferencePriority } from "@/types"
import { DatePicker } from "@/components/ui/DatePicker"

type AreaRef = { id: string; name: string; color: string; icon: string }

type Reference = {
  id: string
  title: string
  url: string
  source?: string | null
  type: ReferenceType
  status: ReferenceStatus
  priority: ReferencePriority
  tags: string[]
  comments?: string | null
  highlights?: string[]
  plannedDate?: string | Date | null
  createdAt: string | Date
  area?: AreaRef | null
  areas?: { area: AreaRef }[]
}

const STATUS_LABEL: Record<ReferenceStatus, string> = { UNREAD: "Para ler", READING: "Lendo", READ: "Lido", ARCHIVED: "Arquivado" }
const STATUS_ICON: Record<string, React.ReactNode> = {
  UNREAD: <Circle size={14} className="text-cockpit-muted" />,
  READING: <BookMarked size={14} className="text-amber-500" />,
  READ: <CheckCircle size={14} className="text-emerald-500" />,
}
const STATUS_COLOR: Record<ReferenceStatus, string> = {
  UNREAD: "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30",
  READING: "border-amber-400/40 bg-amber-500/5 text-amber-600",
  READ: "border-emerald-400/40 bg-emerald-500/5 text-emerald-600",
  ARCHIVED: "border-cockpit-border text-cockpit-muted",
}
const TYPE_LABEL: Record<ReferenceType, string> = { VIDEO: "Vídeo", ARTICLE: "Artigo", BLOG: "Blog", PODCAST: "Podcast", DOCUMENT: "Documento", OTHER: "Outro" }
const PRIORITY_LABEL: Record<ReferencePriority, string> = { HIGH: "Alta", NORMAL: "Normal", LOW: "Baixa" }
const PRIORITY_COLOR: Record<ReferencePriority, string> = { HIGH: "bg-red-500/10 text-red-500", NORMAL: "bg-cockpit-border-light text-cockpit-muted", LOW: "bg-cockpit-border-light text-cockpit-muted opacity-60" }

interface Props {
  reference: Reference
  areas: Area[]
  onClose: () => void
  onUpdate: (ref: Reference) => void
  onArchive: (id: string) => void
}

export function ReferenceDetailPanel({ reference, areas, onClose, onUpdate, onArchive }: Props) {
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState(reference.title)
  const [titleChanged, setTitleChanged] = useState(false)
  const [url, setUrl] = useState(reference.url)
  const [urlChanged, setUrlChanged] = useState(false)
  const [comments, setComments] = useState(reference.comments ?? "")
  const [commentsChanged, setCommentsChanged] = useState(false)
  const [highlights, setHighlights] = useState<string[]>(reference.highlights ?? [])
  const [highlightInput, setHighlightInput] = useState("")
  const [tags, setTags] = useState<string[]>(reference.tags)
  const [tagInput, setTagInput] = useState("")
  const [localAreaIds, setLocalAreaIds] = useState<string[]>(
    reference.areas?.map(({ area }) => area.id) ?? (reference.area ? [reference.area.id] : [])
  )
  const [links, setLinks] = useState<string[]>([])
  const [linkInput, setLinkInput] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasChanges = titleChanged || urlChanged || commentsChanged

  function save(data: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateReferenceAction(reference.id, data)
      if (result.success) onUpdate(result.data as Reference)
    })
  }

  function handleSaveTitle() {
    if (!title.trim() || title === reference.title) { setTitleChanged(false); return }
    save({ title })
    setTitleChanged(false)
  }

  function handleSaveUrl() {
    if (!url.trim() || url === reference.url) { setUrlChanged(false); return }
    save({ url })
    setUrlChanged(false)
  }

  function handleSaveComments() {
    save({ comments: comments || null })
    setCommentsChanged(false)
  }

  function handleStatusChange(status: ReferenceStatus) {
    const readAt = status === "READ" ? new Date() : null
    save({ status, readAt })
  }

  function handlePriorityChange(priority: ReferencePriority) {
    save({ priority })
  }

  function handleToggleArea(areaId: string) {
    const next = localAreaIds.includes(areaId)
      ? localAreaIds.filter((id) => id !== areaId)
      : [...localAreaIds, areaId]
    setLocalAreaIds(next)
    save({ areaIds: next })
  }

  function handleAddTag(e: React.KeyboardEvent) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault()
      const next = [...new Set([...tags, tagInput.trim()])]
      setTags(next)
      setTagInput("")
      save({ tags: next })
    }
  }

  function handleRemoveTag(tag: string) {
    const next = tags.filter((t) => t !== tag)
    setTags(next)
    save({ tags: next })
  }

  function handleAddHighlight() {
    if (!highlightInput.trim()) return
    const next = [...highlights, highlightInput.trim()]
    setHighlights(next)
    setHighlightInput("")
    save({ highlights: next })
  }

  function handleRemoveHighlight(idx: number) {
    const next = highlights.filter((_, i) => i !== idx)
    setHighlights(next)
    save({ highlights: next })
  }

  function handleAddLink() {
    if (!linkInput.trim()) return
    setLinks((prev) => [...prev, linkInput.trim()])
    setLinkInput("")
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveReferenceAction(reference.id)
      if (result.success) { onArchive(reference.id); onClose() }
    })
  }

  function handleSaveAll() {
    const data: Record<string, unknown> = {}
    if (titleChanged && title.trim()) data.title = title
    if (urlChanged && url.trim()) data.url = url
    if (commentsChanged) data.comments = comments || null
    if (Object.keys(data).length > 0) save(data)
    setTitleChanged(false); setUrlChanged(false); setCommentsChanged(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-cockpit-surface border-l border-cockpit-border shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-cockpit-border">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <input
                type="text" value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleChanged(true) }}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle() }}
                className="w-full text-base font-semibold text-cockpit-text leading-snug bg-transparent border-b border-transparent hover:border-cockpit-border focus:border-accent focus:outline-none transition-colors py-0.5"
              />
              {titleChanged && <button onClick={handleSaveTitle} disabled={isPending} className="flex-shrink-0 text-accent-dark hover:text-accent"><Save size={14} /></button>}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <a href={reference.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1 truncate">
                <ExternalLink size={11} /> {reference.url}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleArchive} className="p-2 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-colors" title="Arquivar"><Archive size={15} /></button>
            <button onClick={onClose} className="p-2 text-cockpit-muted hover:text-cockpit-text rounded-lg hover:bg-cockpit-surface-hover transition-colors"><X size={15} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Status */}
          <div>
            <p className="text-xs text-cockpit-muted mb-2 font-medium">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {(["UNREAD", "READING", "READ"] as ReferenceStatus[]).map((s) => (
                <button key={s} onClick={() => handleStatusChange(s)} className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  reference.status === s ? STATUS_COLOR[s] : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                )}>
                  {STATUS_ICON[s]} {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Priority + Type */}
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-cockpit-muted mb-2 font-medium">Prioridade</p>
              <div className="flex gap-1.5">
                {(["HIGH", "NORMAL", "LOW"] as ReferencePriority[]).map((p) => (
                  <button key={p} onClick={() => handlePriorityChange(p)} className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    reference.priority === p ? PRIORITY_COLOR[p] + " border-transparent" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                  )}>
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-cockpit-muted mb-2 font-medium">Tipo</p>
              <span className="text-xs text-cockpit-muted bg-cockpit-border-light px-3 py-1.5 rounded-lg">{TYPE_LABEL[reference.type]}</span>
            </div>
          </div>

          {/* Area */}
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

          {/* URL edit */}
          <div>
            <p className="text-xs font-medium text-cockpit-muted flex items-center gap-1.5 mb-2"><Link size={13} /> URL principal</p>
            <div className="flex items-center gap-2">
              <input type="url" value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlChanged(true) }}
                onBlur={handleSaveUrl}
                className="flex-1 px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              {urlChanged && <button onClick={handleSaveUrl} className="text-accent-dark hover:text-accent"><Save size={14} /></button>}
            </div>
          </div>

          {/* Links adicionais */}
          <div>
            <p className="text-xs font-medium text-cockpit-muted flex items-center gap-1.5 mb-2"><Link size={13} /> Links relacionados</p>
            {links.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl">
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline truncate flex-1 flex items-center gap-1">
                      <ExternalLink size={10} /> {link}
                    </a>
                    <button onClick={() => setLinks((p) => p.filter((_, j) => j !== i))} className="text-cockpit-muted hover:text-red-400"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="url" value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddLink() }}
                placeholder="https://..."
                className="flex-1 px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
              <button onClick={handleAddLink} className="p-2 text-accent rounded-xl hover:bg-accent/10 transition-colors border border-accent/20"><Plus size={14} /></button>
            </div>
          </div>

          {/* Destaques / Highlights */}
          <div>
            <p className="text-xs font-medium text-cockpit-muted flex items-center gap-1.5 mb-2"><Highlighter size={13} /> Destaques</p>
            {highlights.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">"</span>
                    <p className="text-xs text-cockpit-text flex-1 italic">{h}</p>
                    <button onClick={() => handleRemoveHighlight(i)} className="text-cockpit-muted hover:text-red-400 flex-shrink-0"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="text" value={highlightInput}
                onChange={(e) => setHighlightInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddHighlight() }}
                placeholder="Adicionar trecho importante..."
                className="flex-1 px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
              <button onClick={handleAddHighlight} className="p-2 text-accent rounded-xl hover:bg-accent/10 transition-colors border border-accent/20"><Plus size={14} /></button>
            </div>
          </div>

          {/* Anotações / Comments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-cockpit-muted flex items-center gap-1.5"><FileText size={13} /> Anotações</p>
              {commentsChanged && (
                <button onClick={handleSaveComments} disabled={isPending} className="flex items-center gap-1 text-xs text-accent-dark hover:text-accent">
                  {isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Salvar
                </button>
              )}
            </div>
            <textarea value={comments}
              onChange={(e) => { setComments(e.target.value); setCommentsChanged(true) }}
              placeholder="Anotações, resumos, insights..."
              rows={5}
              className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-medium text-cockpit-muted flex items-center gap-1.5 mb-2"><Tag size={13} /> Tags</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-accent/10 text-accent-dark">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400"><X size={10} /></button>
                </span>
              ))}
            </div>
            <input type="text" value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Nova tag (Enter)"
              className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>

          {/* Anexos */}
          <div>
            <p className="text-xs font-medium text-cockpit-muted flex items-center gap-1.5 mb-3"><Paperclip size={13} /> Anexos</p>
            <input ref={fileInputRef} type="file" multiple className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-cockpit-border rounded-xl text-cockpit-muted hover:border-accent/40 hover:text-cockpit-text transition-colors">
              <Paperclip size={20} strokeWidth={1.5} />
              <span className="text-xs">Clique para anexar arquivos</span>
              <span className="text-[11px] opacity-60">Integração de armazenamento em breve</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-cockpit-border bg-cockpit-bg/50">
          {hasChanges ? (
            <button onClick={handleSaveAll} disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar alterações
            </button>
          ) : (
            <p className="text-center text-xs text-cockpit-muted">Todas as alterações salvas</p>
          )}
        </div>
      </div>
    </>
  )
}
