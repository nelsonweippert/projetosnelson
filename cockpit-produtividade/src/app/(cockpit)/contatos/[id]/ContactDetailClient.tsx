"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  Pencil,
  Archive,
  Building2,
  Briefcase,
  Send,
  AtSign,
  Clock,
  StickyNote,
  Lightbulb,
  Notebook,
  Users as UsersIcon,
  X,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  updateContactAction,
  archiveContactAction,
} from "@/app/actions/contact.actions"
import type { Area, NoteType } from "@/types"

type ContactAreaRef = { id: string; name: string; color: string; icon: string }

type LinkedNote = {
  id: string
  title: string | null
  content: string
  type: NoteType
  source: string | null
  date: string | Date
  isPinned: boolean
  areas?: { area: ContactAreaRef }[]
}

export type ContactDetail = {
  id: string
  name: string
  company: string | null
  project: string | null
  telegram: string | null
  twitter: string | null
  notes: string | null
  lastContactAt: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
  area?: ContactAreaRef | null
  linkedNotes: LinkedNote[]
}

interface Props {
  contact: ContactDetail
  areas: Area[]
}

const NOTE_TYPE_LABEL: Record<NoteType, string> = {
  FREE: "Livre",
  JOURNAL: "Diário",
  MEETING: "Reunião",
  IDEA: "Ideia",
  REFERENCE_SUMMARY: "Resumo",
}

const NOTE_TYPE_ICON: Record<NoteType, React.ElementType> = {
  FREE: StickyNote,
  JOURNAL: Notebook,
  MEETING: UsersIcon,
  IDEA: Lightbulb,
  REFERENCE_SUMMARY: StickyNote,
}

const NOTE_TYPE_COLOR: Record<NoteType, string> = {
  FREE: "bg-cockpit-border-light text-cockpit-muted",
  JOURNAL: "bg-blue-500/10 text-blue-600",
  MEETING: "bg-purple-500/10 text-purple-600",
  IDEA: "bg-amber-500/10 text-amber-600",
  REFERENCE_SUMMARY: "bg-emerald-500/10 text-emerald-600",
}

function daysSince(d: string | Date | null): number | null {
  if (!d) return null
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
}

function followUpStatus(d: string | Date | null) {
  const days = daysSince(d)
  if (days === null)
    return {
      color: "text-cockpit-muted",
      bg: "bg-cockpit-border-light",
      label: "Sem contato registrado",
      desc: "Nunca conversou com este contato",
      icon: Clock,
      alert: true,
    }
  if (days > 30)
    return {
      color: "text-red-500",
      bg: "bg-red-500/10",
      label: `Há ${days} dias`,
      desc: "Follow-up urgente",
      icon: AlertCircle,
      alert: true,
    }
  if (days >= 15)
    return {
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      label: `Há ${days} dias`,
      desc: "Follow-up recomendado",
      icon: AlertCircle,
      alert: true,
    }
  if (days > 7)
    return {
      color: "text-cockpit-muted",
      bg: "bg-cockpit-border-light",
      label: `Há ${days} dias`,
      desc: "Em dia",
      icon: Clock,
      alert: false,
    }
  return {
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: days === 0 ? "Hoje" : `Há ${days} dias`,
    desc: "Recente",
    icon: CheckCircle2,
    alert: false,
  }
}

export function ContactDetailClient({ contact: initial, areas }: Props) {
  const router = useRouter()
  const [contact, setContact] = useState<ContactDetail>(initial)
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Edit form
  const [name, setName] = useState(contact.name)
  const [company, setCompany] = useState(contact.company ?? "")
  const [project, setProject] = useState(contact.project ?? "")
  const [telegram, setTelegram] = useState(contact.telegram ?? "")
  const [twitter, setTwitter] = useState(contact.twitter ?? "")
  const [notesField, setNotesField] = useState(contact.notes ?? "")
  const [areaId, setAreaId] = useState(contact.area?.id ?? "")
  const [formError, setFormError] = useState("")

  function resetForm() {
    setName(contact.name)
    setCompany(contact.company ?? "")
    setProject(contact.project ?? "")
    setTelegram(contact.telegram ?? "")
    setTwitter(contact.twitter ?? "")
    setNotesField(contact.notes ?? "")
    setAreaId(contact.area?.id ?? "")
    setFormError("")
    setEditing(false)
  }

  function handleSave() {
    if (!name.trim()) {
      setFormError("Nome obrigatório")
      return
    }
    setFormError("")
    startTransition(async () => {
      const result = await updateContactAction(contact.id, {
        name,
        company: company || undefined,
        project: project || undefined,
        telegram: telegram || undefined,
        twitter: twitter || undefined,
        notes: notesField || undefined,
        areaId: areaId || null,
      })
      if (result.success) {
        const updated = result.data as ContactDetail
        setContact({ ...contact, ...updated })
        setEditing(false)
      } else {
        setFormError(result.error ?? "Erro desconhecido")
      }
    })
  }

  function handleArchive() {
    if (!confirm(`Arquivar o contato "${contact.name}"?`)) return
    startTransition(async () => {
      const result = await archiveContactAction(contact.id)
      if (result.success) router.push("/contatos")
    })
  }

  const status = followUpStatus(contact.lastContactAt)
  const StatusIcon = status.icon
  const initials = contact.name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
  const totalNotes = contact.linkedNotes.length

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back */}
      <Link
        href="/contatos"
        className="inline-flex items-center gap-1 text-sm text-cockpit-muted hover:text-cockpit-text"
      >
        <ChevronLeft size={16} />
        Contatos
      </Link>

      {/* Header */}
      <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-5 flex items-start gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
          style={{
            backgroundColor: contact.area?.color
              ? `${contact.area.color}25`
              : "var(--cockpit-border-light)",
            color: contact.area?.color ?? "var(--cockpit-muted)",
          }}
        >
          {initials || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {status.alert && (
              <AlertCircle
                size={20}
                className="text-red-500"
                aria-label="Follow-up pendente"
              />
            )}
            <h1 className="text-2xl font-bold text-cockpit-text truncate">
              {contact.name}
            </h1>
            {contact.area && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-cockpit-border-light text-cockpit-muted">
                {contact.area.icon} {contact.area.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 text-sm text-cockpit-muted flex-wrap">
            {contact.company && (
              <span className="flex items-center gap-1">
                <Building2 size={13} /> {contact.company}
              </span>
            )}
            {contact.project && (
              <span className="flex items-center gap-1">
                <Briefcase size={13} /> {contact.project}
              </span>
            )}
            {contact.telegram && (
              <a
                href={`https://t.me/${contact.telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-accent"
              >
                <Send size={13} /> @{contact.telegram}
              </a>
            )}
            {contact.twitter && (
              <a
                href={`https://twitter.com/${contact.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-accent"
              >
                <AtSign size={13} /> @{contact.twitter}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setEditing((v) => !v)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              editing
                ? "bg-accent/10 text-accent"
                : "text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-surface-hover",
            )}
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={handleArchive}
            className="p-2 rounded-lg text-cockpit-muted hover:text-red-500 hover:bg-red-500/10"
            title="Arquivar"
          >
            <Archive size={16} />
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-cockpit-text">Editar contato</h3>
            <button
              onClick={resetForm}
              className="text-cockpit-muted hover:text-cockpit-text"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nome *">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                autoFocus
              />
            </Field>
            <Field label="Empresa">
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Projeto">
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Área">
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className={inputCls}
              >
                <option value="">— sem área —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {a.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Telegram (@handle)">
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Twitter (@handle)">
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Observações">
            <textarea
              value={notesField}
              onChange={(e) => setNotesField(e.target.value)}
              rows={3}
              className={cn(inputCls, "resize-y")}
            />
          </Field>

          {formError && <p className="text-xs text-red-500">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-xl text-sm text-cockpit-muted hover:text-cockpit-text"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          className={cn(
            "border border-cockpit-border rounded-2xl p-4 flex items-center gap-3",
            status.bg,
          )}
        >
          <StatusIcon size={22} className={status.color} />
          <div className="min-w-0">
            <div className="text-[10px] text-cockpit-muted uppercase tracking-wide">
              Último contato
            </div>
            <div className={cn("text-lg font-bold", status.color)}>
              {status.label}
            </div>
            <div className="text-[11px] text-cockpit-muted truncate">
              {status.desc}
            </div>
          </div>
        </div>

        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-4 flex items-center gap-3">
          <StickyNote size={22} className="text-accent" />
          <div className="min-w-0">
            <div className="text-[10px] text-cockpit-muted uppercase tracking-wide">
              Notas no histórico
            </div>
            <div className="text-lg font-bold text-cockpit-text">{totalNotes}</div>
            <div className="text-[11px] text-cockpit-muted">
              {totalNotes === 0 ? "Nenhuma ainda" : "Conversas registradas"}
            </div>
          </div>
        </div>

        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-4 flex items-center gap-3">
          <CalendarDays size={22} className="text-cockpit-muted" />
          <div className="min-w-0">
            <div className="text-[10px] text-cockpit-muted uppercase tracking-wide">
              Cadastrado em
            </div>
            <div className="text-sm font-semibold text-cockpit-text">
              {new Date(contact.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Observações */}
      {contact.notes && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-4">
          <div className="text-[10px] text-cockpit-muted uppercase tracking-wide mb-1">
            Observações
          </div>
          <p className="text-sm text-cockpit-text whitespace-pre-wrap">
            {contact.notes}
          </p>
        </div>
      )}

      {/* Telegram hint */}
      <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles size={18} className="text-accent flex-shrink-0 mt-0.5" />
        <div className="text-sm text-cockpit-text">
          <p className="font-medium mb-1">Adicione ao histórico via voz</p>
          <p className="text-cockpit-muted text-xs">
            Mande no Telegram:{" "}
            <code className="px-1.5 py-0.5 rounded bg-cockpit-border-light text-cockpit-text font-mono text-[11px]">
              Adicione ao contato {contact.name.split(" ")[0]}: [conteúdo da
              conversa]
            </code>
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-cockpit-text">
            Histórico de conversas
          </h2>
          <span className="text-xs text-cockpit-muted">
            {totalNotes} {totalNotes === 1 ? "registro" : "registros"}
          </span>
        </div>

        {contact.linkedNotes.length === 0 ? (
          <div className="text-center py-12 text-cockpit-muted text-sm bg-cockpit-surface border border-dashed border-cockpit-border rounded-2xl">
            💬 Nenhuma conversa registrada ainda. Mande um áudio no Telegram com
            o gatilho &ldquo;Adicione ao contato {contact.name.split(" ")[0]}&rdquo;.
          </div>
        ) : (
          <div className="space-y-3">
            {contact.linkedNotes.map((note) => {
              const Icon = NOTE_TYPE_ICON[note.type] ?? StickyNote
              return (
                <div
                  key={note.id}
                  className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={cn(
                        "p-1.5 rounded-lg flex-shrink-0",
                        NOTE_TYPE_COLOR[note.type],
                      )}
                    >
                      <Icon size={13} />
                    </span>
                    <span className="text-xs font-medium text-cockpit-muted">
                      {NOTE_TYPE_LABEL[note.type]}
                    </span>
                    <span className="text-[10px] text-cockpit-muted">·</span>
                    <span className="text-[11px] text-cockpit-muted">
                      {new Date(note.date).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {note.source && (
                      <span className="text-[10px] text-cockpit-muted">
                        · via {note.source}
                      </span>
                    )}
                  </div>
                  {note.title && (
                    <h3 className="font-semibold text-cockpit-text mb-2">
                      {note.title}
                    </h3>
                  )}
                  <p className="text-sm text-cockpit-muted whitespace-pre-wrap">
                    {note.content}
                  </p>
                  {note.areas && note.areas.length > 0 && (
                    <div className="flex items-center gap-1 mt-3 flex-wrap">
                      {note.areas.map((na) => (
                        <span
                          key={na.area.id}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-cockpit-border-light text-cockpit-muted"
                        >
                          {na.area.icon} {na.area.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-cockpit-muted">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-cockpit-bg border border-cockpit-border text-sm text-cockpit-text outline-none focus:border-accent/50"
