"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  X,
  Loader2,
  Search,
  Building2,
  Briefcase,
  Send,
  AtSign,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Archive,
  ChevronRight,
  StickyNote,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  createContactAction,
  archiveContactAction,
} from "@/app/actions/contact.actions"
import type { Area, ContactStats } from "@/types"

type ContactAreaRef = { id: string; name: string; color: string; icon: string }

export type ContactRow = {
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
  _count?: { linkedNotes: number }
}

interface Props {
  initialContacts: ContactRow[]
  initialStats: ContactStats
  areas: Area[]
}

function daysSince(d: string | Date | null): number | null {
  if (!d) return null
  const t = new Date(d).getTime()
  return Math.floor((Date.now() - t) / 86_400_000)
}

function followUpStatus(d: string | Date | null) {
  const days = daysSince(d)
  if (days === null) return { color: "text-cockpit-muted", label: "Sem contato", icon: Clock, urgency: 0 }
  if (days > 30) return { color: "text-red-500", label: `há ${days}d`, icon: AlertTriangle, urgency: 3 }
  if (days > 14) return { color: "text-amber-500", label: `há ${days}d`, icon: AlertTriangle, urgency: 2 }
  if (days > 7) return { color: "text-cockpit-muted", label: `há ${days}d`, icon: Clock, urgency: 1 }
  return { color: "text-emerald-500", label: `há ${days}d`, icon: CheckCircle2, urgency: 0 }
}

export function ContatosClient({ initialContacts, initialStats, areas }: Props) {
  const router = useRouter()
  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts)
  const [stats, setStats] = useState<ContactStats>(initialStats)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState("")
  const [filterArea, setFilterArea] = useState<string | "ALL">("ALL")
  const [filterStale, setFilterStale] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form (apenas criação — edição mora no /contatos/[id])
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [project, setProject] = useState("")
  const [telegram, setTelegram] = useState("")
  const [twitter, setTwitter] = useState("")
  const [notesField, setNotesField] = useState("")
  const [areaId, setAreaId] = useState<string>("")
  const [formError, setFormError] = useState("")

  function resetForm() {
    setName("")
    setCompany("")
    setProject("")
    setTelegram("")
    setTwitter("")
    setNotesField("")
    setAreaId("")
    setFormError("")
    setShowForm(false)
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
  }

  function openDetail(id: string) {
    router.push(`/contatos/${id}`)
  }

  function handleSave() {
    if (!name.trim()) {
      setFormError("Nome obrigatório")
      return
    }
    setFormError("")
    startTransition(async () => {
      const result = await createContactAction({
        name,
        company: company || undefined,
        project: project || undefined,
        telegram: telegram || undefined,
        twitter: twitter || undefined,
        notes: notesField || undefined,
        areaId: areaId || null,
      })
      if (result.success) {
        const c = result.data as ContactRow
        setContacts((prev) => [c, ...prev])
        setStats((s) => ({
          ...s,
          total: s.total + 1,
          neverContacted: s.neverContacted + 1,
          needsFollowUp: s.needsFollowUp + 1,
        }))
        resetForm()
      } else {
        setFormError(result.error ?? "Erro desconhecido")
      }
    })
  }

  function handleArchive(id: string) {
    if (!confirm("Arquivar este contato?")) return
    startTransition(async () => {
      const result = await archiveContactAction(id)
      if (result.success) {
        setContacts((prev) => prev.filter((c) => c.id !== id))
      }
    })
  }

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (filterArea !== "ALL" && c.area?.id !== filterArea) return false
      if (filterStale) {
        const days = daysSince(c.lastContactAt)
        if (days !== null && days <= 14) return false
      }
      if (search) {
        const q = search.toLowerCase()
        const haystack = [
          c.name,
          c.company ?? "",
          c.project ?? "",
          c.telegram ?? "",
          c.twitter ?? "",
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [contacts, filterArea, filterStale, search])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text">Contatos</h1>
          <p className="text-sm text-cockpit-muted mt-1">
            {stats.total} contato(s){" "}
            {stats.needsFollowUp > 0 && (
              <span className="text-amber-500">
                — {stats.needsFollowUp} precisam de follow-up
              </span>
            )}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors"
        >
          <Plus size={16} />
          Novo contato
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Users size={16} />}
          label="Total"
          value={stats.total}
          tone="neutral"
        />
        <StatCard
          icon={<Clock size={16} />}
          label="Sem contato"
          value={stats.neverContacted}
          tone="neutral"
        />
        <StatCard
          icon={<AlertTriangle size={16} />}
          label=">14 dias"
          value={stats.staleOver14d}
          tone="amber"
        />
        <StatCard
          icon={<AlertTriangle size={16} />}
          label=">30 dias"
          value={stats.staleOver30d}
          tone="red"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-cockpit-muted"
          />
          <input
            type="text"
            placeholder="Buscar por nome, empresa, projeto, handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-cockpit-surface border border-cockpit-border text-sm text-cockpit-text outline-none focus:border-accent/50"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterStale((v) => !v)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
              filterStale
                ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                : "bg-cockpit-border-light text-cockpit-muted hover:text-cockpit-text",
            )}
          >
            <AlertTriangle size={12} /> Follow-up pendente
          </button>
          {areas.length > 0 && (
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="px-3 py-1.5 rounded-full bg-cockpit-border-light text-cockpit-muted hover:text-cockpit-text text-xs font-medium border-none outline-none cursor-pointer"
            >
              <option value="ALL">Todas as áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-cockpit-text">Novo contato</h3>
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
                placeholder="Pedro Almeida"
                className={inputCls}
                autoFocus
              />
            </Field>
            <Field label="Empresa">
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="TempestLabs"
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
                placeholder="Wraithfall, Cockpit..."
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
                placeholder="pedroalmeida"
                className={inputCls}
              />
            </Field>
            <Field label="Twitter (@handle)">
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="pedroalmeida"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Observações">
            <textarea
              value={notesField}
              onChange={(e) => setNotesField(e.target.value)}
              rows={3}
              placeholder="Como conheceu, contexto, preferências..."
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
              Criar contato
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-cockpit-muted text-sm">
          {contacts.length === 0
            ? "👥 Nenhum contato ainda. Adicione clientes, parceiros ou leads para fazer follow-up."
            : "Nenhum contato corresponde aos filtros."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <ContactRowCard
              key={c.id}
              contact={c}
              onOpen={() => openDetail(c.id)}
              onArchive={() => handleArchive(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ContactRowCard({
  contact,
  onOpen,
  onArchive,
}: {
  contact: ContactRow
  onOpen: () => void
  onArchive: () => void
}) {
  const status = followUpStatus(contact.lastContactAt)
  const StatusIcon = status.icon
  const days = daysSince(contact.lastContactAt)
  const needsAlert = days === null || days >= 15
  const initials = contact.name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div
      onClick={onOpen}
      className="cursor-pointer bg-cockpit-surface border border-cockpit-border rounded-2xl p-4 hover:border-accent/40 transition-colors flex items-center gap-4"
    >
      {/* Avatar */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
        style={{
          backgroundColor: contact.area?.color
            ? `${contact.area.color}20`
            : "var(--cockpit-border-light)",
          color: contact.area?.color ?? "var(--cockpit-muted)",
        }}
      >
        {initials || "?"}
      </div>

      {/* Main */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {needsAlert && (
            <AlertCircle
              size={16}
              className="text-red-500 flex-shrink-0"
              aria-label="Follow-up pendente"
            />
          )}
          <h3 className="font-semibold text-cockpit-text truncate">
            {contact.name}
          </h3>
          {contact.area && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cockpit-border-light text-cockpit-muted">
              {contact.area.icon} {contact.area.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-cockpit-muted flex-wrap">
          {contact.company && (
            <span className="flex items-center gap-1">
              <Building2 size={11} /> {contact.company}
            </span>
          )}
          {contact.project && (
            <span className="flex items-center gap-1">
              <Briefcase size={11} /> {contact.project}
            </span>
          )}
          {contact.telegram && (
            <a
              href={`https://t.me/${contact.telegram}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-accent"
            >
              <Send size={11} /> @{contact.telegram}
            </a>
          )}
          {contact.twitter && (
            <a
              href={`https://twitter.com/${contact.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-accent"
            >
              <AtSign size={11} /> @{contact.twitter}
            </a>
          )}
          {contact._count && contact._count.linkedNotes > 0 && (
            <span className="flex items-center gap-1">
              <StickyNote size={11} /> {contact._count.linkedNotes} nota(s)
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className={cn("flex items-center gap-1 text-xs", status.color)}>
          <StatusIcon size={12} />
          <span>{status.label}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onArchive()
          }}
          title="Arquivar"
          className="p-1.5 rounded-lg text-cockpit-muted hover:text-red-500 hover:bg-red-500/10"
        >
          <Archive size={14} />
        </button>
        <ChevronRight size={14} className="text-cockpit-muted" />
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: "neutral" | "amber" | "red"
}) {
  const toneCls = {
    neutral: "text-accent",
    amber: "text-amber-500",
    red: "text-red-500",
  }[tone]
  return (
    <div className="bg-cockpit-surface border border-cockpit-border rounded-2xl p-3 flex items-center gap-3">
      <div className={toneCls}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] text-cockpit-muted uppercase tracking-wide truncate">
          {label}
        </div>
        <div className="text-lg font-bold text-cockpit-text">{value}</div>
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
