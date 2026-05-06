"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  Inbox, Calendar, BookOpen, AlertTriangle, ChevronRight, Loader2,
  Target, BookMarked,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateTaskAction } from "@/app/actions/task.actions"
import { updateReferenceStatusAction } from "@/app/actions/reference.actions"
import type {
  Task, TaskArea, Area, Reference, ReferenceArea, Study, StudyArea,
} from "@/types"

type TaskRow = Task & { areas: (TaskArea & { area: Area })[] }
type RefRow = Reference & { areas: (ReferenceArea & { area: Area })[]; area?: Area | null }
type StudyRow = Study & { areas: (StudyArea & { area: Area })[]; area?: Area | null }

type Inbox = {
  tasksWithoutDue: TaskRow[]
  unreadReferences: RefRow[]
  reviewCaptures: TaskRow[]
  studiesNotStarted: StudyRow[]
  counts: {
    tasksWithoutDue: number
    unreadReferences: number
    reviewCaptures: number
    studiesNotStarted: number
    total: number
  }
}

interface Props {
  initial: Inbox
}

export function InboxClient({ initial }: Props) {
  const [data, setData] = useState<Inbox>(initial)
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<keyof Inbox["counts"]>("tasksWithoutDue")

  function setTaskDue(id: string, when: "today" | "tomorrow" | "nextWeek") {
    const date = new Date()
    if (when === "tomorrow") date.setDate(date.getDate() + 1)
    if (when === "nextWeek") date.setDate(date.getDate() + 7)
    date.setHours(23, 59, 59, 999)

    startTransition(async () => {
      const result = await updateTaskAction(id, { dueDate: date })
      if (result.success) {
        setData((prev) => ({
          ...prev,
          tasksWithoutDue: prev.tasksWithoutDue.filter((t) => t.id !== id),
          counts: { ...prev.counts, tasksWithoutDue: prev.counts.tasksWithoutDue - 1, total: prev.counts.total - 1 },
        }))
      }
    })
  }

  function markRefStatus(id: string, status: "READING" | "READ") {
    startTransition(async () => {
      const result = await updateReferenceStatusAction(id, status)
      if (result.success) {
        setData((prev) => ({
          ...prev,
          unreadReferences: prev.unreadReferences.filter((r) => r.id !== id),
          counts: { ...prev.counts, unreadReferences: prev.counts.unreadReferences - 1, total: prev.counts.total - 1 },
        }))
      }
    })
  }

  function promoteCapture(id: string) {
    // Remove o prefixo [REVISAR] e sobe priority pra MEDIUM
    const task = data.reviewCaptures.find((t) => t.id === id)
    if (!task) return
    const newTitle = task.title.replace(/^\[REVISAR\]\s*/, "")
    startTransition(async () => {
      const result = await updateTaskAction(id, { title: newTitle, priority: "MEDIUM" })
      if (result.success) {
        setData((prev) => ({
          ...prev,
          reviewCaptures: prev.reviewCaptures.filter((t) => t.id !== id),
          counts: { ...prev.counts, reviewCaptures: prev.counts.reviewCaptures - 1, total: prev.counts.total - 1 },
        }))
      }
    })
  }

  const tabs = [
    { key: "tasksWithoutDue" as const, label: "Sem prazo", icon: Calendar, count: data.counts.tasksWithoutDue },
    { key: "unreadReferences" as const, label: "Pra ler", icon: BookOpen, count: data.counts.unreadReferences },
    { key: "reviewCaptures" as const, label: "Captures", icon: AlertTriangle, count: data.counts.reviewCaptures },
    { key: "studiesNotStarted" as const, label: "Estudos parados", icon: Target, count: data.counts.studiesNotStarted },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <Inbox size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-cockpit-text">Inbox</h1>
            <p className="text-sm text-cockpit-muted">
              {data.counts.total} item(ns) pra triar — capture first, organize later
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                active
                  ? "bg-accent text-white"
                  : "bg-cockpit-border-light text-cockpit-muted hover:text-cockpit-text",
              )}
            >
              <t.icon size={12} />
              {t.label}
              <span className={cn(
                "ml-1 px-1.5 rounded-full text-[10px]",
                active ? "bg-white/20" : "bg-cockpit-border",
              )}>
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content por tab */}
      <div className="cockpit-card">
        {tab === "tasksWithoutDue" && (
          <TaskList
            items={data.tasksWithoutDue}
            empty="🎉 Toda task tem um prazo. Inbox limpo aqui."
            renderActions={(t) => (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setTaskDue(t.id, "today")} disabled={isPending} className={chipBtn}>
                  hoje
                </button>
                <button onClick={() => setTaskDue(t.id, "tomorrow")} disabled={isPending} className={chipBtn}>
                  amanhã
                </button>
                <button onClick={() => setTaskDue(t.id, "nextWeek")} disabled={isPending} className={chipBtn}>
                  +7d
                </button>
              </div>
            )}
            isPending={isPending}
          />
        )}

        {tab === "unreadReferences" && (
          <RefList
            items={data.unreadReferences}
            empty="📚 Tudo lido (ou em progresso recente). Lugar pra novas ideias."
            onAction={(r, action) => markRefStatus(r.id, action)}
            isPending={isPending}
          />
        )}

        {tab === "reviewCaptures" && (
          <CaptureList
            items={data.reviewCaptures}
            empty="🔔 Sem captures pendentes do worker. Bom!"
            onPromote={promoteCapture}
            isPending={isPending}
          />
        )}

        {tab === "studiesNotStarted" && (
          <StudyList
            items={data.studiesNotStarted}
            empty="📖 Sem projetos parados. Tudo em movimento."
          />
        )}
      </div>
    </div>
  )
}

const chipBtn =
  "text-[11px] px-2 py-0.5 rounded-md bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 transition-colors whitespace-nowrap"

function TaskList({
  items, empty, renderActions, isPending,
}: {
  items: TaskRow[]
  empty: string
  renderActions: (t: TaskRow) => React.ReactNode
  isPending: boolean
}) {
  if (items.length === 0)
    return <p className="text-sm text-cockpit-muted text-center py-8">{empty}</p>
  return (
    <div className="space-y-1">
      {items.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-cockpit-surface border border-cockpit-border hover:border-accent/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-cockpit-text truncate">{t.title}</p>
            <p className="text-[11px] text-cockpit-muted">
              {t.areas.length > 0
                ? t.areas.map((a) => `${a.area.icon} ${a.area.name}`).join(" · ")
                : "sem área"}
            </p>
          </div>
          {renderActions(t)}
        </div>
      ))}
    </div>
  )
}

function RefList({
  items, empty, onAction, isPending,
}: {
  items: RefRow[]
  empty: string
  onAction: (r: RefRow, action: "READING" | "READ") => void
  isPending: boolean
}) {
  if (items.length === 0)
    return <p className="text-sm text-cockpit-muted text-center py-8">{empty}</p>
  return (
    <div className="space-y-1">
      {items.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-cockpit-surface border border-cockpit-border hover:border-accent/30 transition-colors"
        >
          <BookMarked size={14} className="text-purple-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-cockpit-text truncate hover:text-accent block"
            >
              {r.title}
            </a>
            <p className="text-[11px] text-cockpit-muted">
              {r.source ?? r.type} · {r.priority} · {r.tags.slice(0, 2).join(", ")}
            </p>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onAction(r, "READING")} disabled={isPending} className={chipBtn}>
              lendo
            </button>
            <button onClick={() => onAction(r, "READ")} disabled={isPending} className={chipBtn}>
              lido
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function CaptureList({
  items, empty, onPromote, isPending,
}: {
  items: TaskRow[]
  empty: string
  onPromote: (id: string) => void
  isPending: boolean
}) {
  if (items.length === 0)
    return <p className="text-sm text-cockpit-muted text-center py-8">{empty}</p>
  return (
    <div className="space-y-1">
      {items.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-3 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20"
        >
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-cockpit-text">
              {t.title.replace(/^\[REVISAR\]\s*/, "")}
            </p>
            {t.description && (
              <p className="text-[11px] text-cockpit-muted line-clamp-2 mt-0.5">
                {t.description.split("\n\n").pop()}
              </p>
            )}
          </div>
          <button
            onClick={() => onPromote(t.id)}
            disabled={isPending}
            className={chipBtn}
            title="Promover pra task normal"
          >
            {isPending ? <Loader2 size={11} className="animate-spin" /> : "promover"}
          </button>
        </div>
      ))}
    </div>
  )
}

function StudyList({ items, empty }: { items: StudyRow[]; empty: string }) {
  if (items.length === 0)
    return <p className="text-sm text-cockpit-muted text-center py-8">{empty}</p>
  return (
    <div className="space-y-1">
      {items.map((s) => (
        <Link
          key={s.id}
          href="/estudos/projetos"
          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-cockpit-surface border border-cockpit-border hover:border-accent/30 transition-colors"
        >
          <Target size={14} className="text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-cockpit-text truncate">{s.title}</p>
            <p className="text-[11px] text-cockpit-muted">
              {s.category} · criado {new Date(s.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <ChevronRight size={14} className="text-cockpit-muted" />
        </Link>
      ))}
    </div>
  )
}
