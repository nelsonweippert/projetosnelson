"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  CheckCircle, Circle, Clock, Calendar, AlertTriangle, Sparkles,
  ChevronRight, Sunrise, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateTaskAction } from "@/app/actions/task.actions"
import type {
  Task, TaskArea, Area, Subtask, CalendarEvent, TaskPriority,
} from "@/types"

type TaskRow = Task & { areas: (TaskArea & { area: Area })[]; subtasks: Subtask[] }
type EventRow = CalendarEvent & { area?: Area | null }

type DigestShape = {
  completedYesterday: TaskRow[]
  todayTasks: TaskRow[]
  carryOvers: TaskRow[]
  todayEvents: EventRow[]
  reviewCaptures: TaskRow[]
}

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  HIGH: "text-red-500",
  MEDIUM: "text-amber-500",
  LOW: "text-cockpit-muted",
}

interface Props {
  digest: DigestShape
  reflectionPrompt: string
  userName: string
}

export function DailyClient({ digest, reflectionPrompt, userName }: Props) {
  const [d, setD] = useState<DigestShape>(digest)
  const [isPending, startTransition] = useTransition()

  function completeTask(id: string) {
    startTransition(async () => {
      const result = await updateTaskAction(id, { status: "DONE" })
      if (result.success) {
        const moved =
          d.todayTasks.find((t) => t.id === id) ??
          d.carryOvers.find((t) => t.id === id) ??
          d.reviewCaptures.find((t) => t.id === id)
        if (!moved) return
        setD((prev) => ({
          ...prev,
          todayTasks: prev.todayTasks.filter((t) => t.id !== id),
          carryOvers: prev.carryOvers.filter((t) => t.id !== id),
          reviewCaptures: prev.reviewCaptures.filter((t) => t.id !== id),
          completedYesterday: prev.completedYesterday, // continua sendo "ontem"
        }))
      }
    })
  }

  function moveToToday(id: string) {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    startTransition(async () => {
      const result = await updateTaskAction(id, { dueDate: today })
      if (result.success) {
        const carry = d.carryOvers.find((t) => t.id === id)
        if (!carry) return
        setD((prev) => ({
          ...prev,
          carryOvers: prev.carryOvers.filter((t) => t.id !== id),
          todayTasks: [...prev.todayTasks, { ...carry, dueDate: today }],
        }))
      }
    })
  }

  const totalToday = d.todayTasks.length + d.carryOvers.length

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-cockpit-muted mb-1">
            <Sunrise size={12} className="text-amber-500" />
            <span>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
          <h1 className="text-2xl font-bold text-cockpit-text">
            Bom dia, {userName}
          </h1>
          <p className="text-sm text-cockpit-muted mt-1">
            {totalToday === 0
              ? "Nada agendado pra hoje. Hora de planejar."
              : `${totalToday} item(ns) na sua agenda.`}
          </p>
        </div>
      </div>

      {/* Reflection Prompt */}
      <div className="cockpit-card border-l-4 border-l-accent flex items-start gap-3">
        <Sparkles size={16} className="text-accent mt-0.5 shrink-0" />
        <p className="text-sm text-cockpit-text italic">{reflectionPrompt}</p>
      </div>

      {/* Hoje (todayTasks + carryOvers + events) */}
      <Section
        title="📅 Hoje"
        subtitle={`${d.todayTasks.length} tarefa(s) + ${d.todayEvents.length} evento(s) + ${d.carryOvers.length} atrasada(s)`}
      >
        {d.todayEvents.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {d.todayEvents.map((e) => (
              <Link
                key={e.id}
                href="/calendario"
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 transition-colors"
              >
                <Calendar size={14} className="text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cockpit-text font-medium truncate">{e.title}</p>
                  <p className="text-[11px] text-cockpit-muted">
                    {new Date(e.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {e.location ? ` · ${e.location}` : ""}
                    {e.area ? ` · ${e.area.icon} ${e.area.name}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {d.todayTasks.length === 0 && d.carryOvers.length === 0 && d.todayEvents.length === 0 ? (
          <p className="text-sm text-cockpit-muted text-center py-6">
            Sem tarefas com prazo hoje.
            <Link href="/tarefas" className="text-accent ml-1 hover:underline">
              Ver todas
            </Link>
          </p>
        ) : (
          <div className="space-y-1">
            {d.todayTasks.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onComplete={() => completeTask(t.id)}
                isPending={isPending}
              />
            ))}
            {d.carryOvers.length > 0 && d.todayTasks.length > 0 && (
              <div className="border-t border-cockpit-border my-3" />
            )}
            {d.carryOvers.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onComplete={() => completeTask(t.id)}
                onMoveToday={() => moveToToday(t.id)}
                isOverdue
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Captures pra revisar */}
      {d.reviewCaptures.length > 0 && (
        <Section
          title="🔔 Captures pra revisar"
          subtitle={`${d.reviewCaptures.length} mensagem(ns) do worker que ficaram ambíguas`}
        >
          <div className="space-y-1">
            {d.reviewCaptures.map((t) => (
              <Link
                key={t.id}
                href="/tarefas"
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 transition-colors"
              >
                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cockpit-text truncate">{t.title.replace(/^\[REVISAR\]\s*/, "")}</p>
                  {t.description && (
                    <p className="text-[11px] text-cockpit-muted line-clamp-1">{t.description.split("\n")[0]}</p>
                  )}
                </div>
                <ChevronRight size={14} className="text-cockpit-muted" />
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Ontem */}
      {d.completedYesterday.length > 0 && (
        <Section
          title="✓ Ontem"
          subtitle={`${d.completedYesterday.length} concluída(s)`}
          dimmed
        >
          <div className="space-y-1">
            {d.completedYesterday.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10"
              >
                <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                <p className="text-sm text-cockpit-muted line-through truncate flex-1">{t.title}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Empty state */}
      {totalToday === 0 && d.reviewCaptures.length === 0 && d.completedYesterday.length === 0 && (
        <div className="cockpit-card text-center py-10 space-y-3">
          <Sunrise className="mx-auto text-amber-500" size={32} />
          <h3 className="text-cockpit-text font-semibold">Dia em branco</h3>
          <p className="text-sm text-cockpit-muted">
            Sem tarefas, eventos ou capturas pendentes. Comece criando uma tarefa pra hoje.
          </p>
          <Link
            href="/tarefas"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark"
          >
            <ChevronRight size={14} /> Ir pra Tarefas
          </Link>
        </div>
      )}
    </div>
  )
}

function Section({
  title, subtitle, children, dimmed = false,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  dimmed?: boolean
}) {
  return (
    <div className={cn("cockpit-card", dimmed && "opacity-70")}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-cockpit-text">{title}</h2>
          {subtitle && <p className="text-[11px] text-cockpit-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function TaskItem({
  task, onComplete, onMoveToday, isOverdue, isPending,
}: {
  task: TaskRow
  onComplete: () => void
  onMoveToday?: () => void
  isOverdue?: boolean
  isPending?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors",
        isOverdue
          ? "bg-red-500/5 border-red-500/20"
          : "bg-cockpit-surface border-cockpit-border hover:border-accent/30",
      )}
    >
      <button
        onClick={onComplete}
        disabled={isPending}
        className="text-cockpit-muted hover:text-emerald-500 transition-colors disabled:opacity-50"
        title="Marcar como concluída"
      >
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Circle size={16} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-cockpit-text truncate">{task.title}</p>
        <p className="text-[11px] text-cockpit-muted flex items-center gap-2">
          <span className={PRIORITY_COLOR[task.priority]}>● {task.priority}</span>
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {new Date(task.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}
          {task.areas.slice(0, 2).map((a) => (
            <span key={a.area.id}>
              {a.area.icon} {a.area.name}
            </span>
          ))}
        </p>
      </div>
      {isOverdue && onMoveToday && (
        <button
          onClick={onMoveToday}
          disabled={isPending}
          className="text-[11px] px-2 py-1 rounded-lg text-accent hover:bg-accent/10 disabled:opacity-50 whitespace-nowrap"
          title="Mover pra hoje"
        >
          → hoje
        </button>
      )}
    </div>
  )
}
