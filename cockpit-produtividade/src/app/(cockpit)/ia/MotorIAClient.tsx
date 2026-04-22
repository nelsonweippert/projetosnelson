"use client"

import { useState, useTransition } from "react"
import { Sparkles, Loader2, CheckSquare, BookOpen, DollarSign, Video, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  generateWeeklyReviewAction,
  generateModuleInsightAction,
  reactToInsightAction,
} from "@/app/actions/ai.actions"

type Insight = {
  id: string
  module: string
  type: string
  content: string
  reaction?: string | null
  createdAt: Date | string
}

const MODULE_OPTIONS = [
  { id: "tasks", label: "Tarefas", icon: CheckSquare, color: "text-blue-500" },
  { id: "finance", label: "Financeiro", icon: DollarSign, color: "text-emerald-500" },
  { id: "studies", label: "Estudos", icon: BookOpen, color: "text-purple-500" },
] as const

interface Props {
  initialInsights: Insight[]
}

export function MotorIAClient({ initialInsights }: Props) {
  const [insights, setInsights] = useState<Insight[]>(initialInsights)
  const [activeInsight, setActiveInsight] = useState<string | null>(null)
  const [generatedText, setGeneratedText] = useState<string | null>(null)
  const [selectedModule, setSelectedModule] = useState<"tasks" | "finance" | "studies">("tasks")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleWeeklyReview() {
    setError(null)
    setGeneratedText(null)
    startTransition(async () => {
      const result = await generateWeeklyReviewAction()
      if (result.success) {
        setGeneratedText(result.data)
        setInsights((prev) => {
          const updated = [...prev]
          updated.unshift({
            id: Date.now().toString(),
            module: "all",
            type: "weekly_review",
            content: result.data,
            createdAt: new Date(),
          })
          return updated
        })
      } else {
        setError(result.error)
      }
    })
  }

  function handleModuleInsight() {
    setError(null)
    setGeneratedText(null)
    startTransition(async () => {
      const result = await generateModuleInsightAction(selectedModule)
      if (result.success) {
        setGeneratedText(result.data)
        setInsights((prev) => {
          const updated = [...prev]
          updated.unshift({
            id: Date.now().toString(),
            module: selectedModule,
            type: "module_insight",
            content: result.data,
            createdAt: new Date(),
          })
          return updated
        })
      } else {
        setError(result.error)
      }
    })
  }

  function handleReaction(id: string, reaction: "👍" | "👎") {
    startTransition(async () => {
      const result = await reactToInsightAction(id, reaction)
      if (result.success) {
        setInsights((prev) => prev.map((i) => i.id === id ? { ...i, reaction } : i))
      }
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-cockpit-text flex items-center gap-2">
          <Sparkles size={22} className="text-accent" />
          Motor IA
        </h1>
        <p className="text-sm text-cockpit-muted mt-1">Análises e insights gerados pelo Claude com base nos seus dados</p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Weekly Review */}
        <div className="cockpit-card space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-cockpit-text">Revisão Semanal</h2>
          </div>
          <p className="text-xs text-cockpit-muted">
            Análise completa da sua semana: tarefas, estudos, finanças e conteúdo.
          </p>
          <button
            onClick={handleWeeklyReview}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Gerar Revisão
          </button>
        </div>

        {/* Module Insight */}
        <div className="cockpit-card space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" />
            <h2 className="text-sm font-semibold text-cockpit-text">Insight por Módulo</h2>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {MODULE_OPTIONS.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setSelectedModule(mod.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  selectedModule === mod.id
                    ? "border-transparent bg-accent/10 text-accent-dark"
                    : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30"
                )}
              >
                <mod.icon size={12} className={selectedModule === mod.id ? "text-accent" : mod.color} />
                {mod.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleModuleInsight}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500/10 text-purple-600 text-sm font-semibold rounded-xl hover:bg-purple-500/20 border border-purple-500/20 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Analisar {MODULE_OPTIONS.find((m) => m.id === selectedModule)?.label}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Last generated */}
      {generatedText && (
        <div className="cockpit-card space-y-3 border-accent/30">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-xs font-semibold text-accent-dark">Insight gerado agora</span>
          </div>
          <p className="text-sm text-cockpit-text leading-relaxed whitespace-pre-wrap">{generatedText}</p>
        </div>
      )}

      {/* History */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-cockpit-text">Histórico de Insights</h2>
          {insights.map((insight) => (
            <div key={insight.id} className="cockpit-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full",
                    insight.type === "weekly_review"
                      ? "bg-accent/10 text-accent-dark"
                      : "bg-purple-500/10 text-purple-600")}>
                    {insight.type === "weekly_review" ? "Revisão Semanal" : `Insight: ${insight.module}`}
                  </span>
                  <span className="text-[10px] text-cockpit-muted">
                    {new Date(insight.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {insight.id !== insights[0]?.id || !generatedText ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleReaction(insight.id, "👍")}
                      className={cn("p-1.5 rounded-lg transition-colors",
                        insight.reaction === "👍" ? "text-emerald-500 bg-emerald-500/10" : "text-cockpit-muted hover:text-emerald-500")}
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button
                      onClick={() => handleReaction(insight.id, "👎")}
                      className={cn("p-1.5 rounded-lg transition-colors",
                        insight.reaction === "👎" ? "text-red-500 bg-red-500/10" : "text-cockpit-muted hover:text-red-500")}
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className={cn("text-sm text-cockpit-text leading-relaxed whitespace-pre-wrap",
                activeInsight !== insight.id && "line-clamp-3")}>
                {insight.content}
              </div>

              {insight.content.length > 200 && (
                <button
                  onClick={() => setActiveInsight(activeInsight === insight.id ? null : insight.id)}
                  className="text-xs text-accent-dark hover:text-accent transition-colors"
                >
                  {activeInsight === insight.id ? "Ver menos" : "Ver mais"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {insights.length === 0 && !generatedText && (
        <div className="cockpit-card flex flex-col items-center justify-center py-16 text-cockpit-muted">
          <Sparkles size={32} strokeWidth={1} />
          <p className="text-sm mt-3">Nenhum insight gerado ainda</p>
          <p className="text-xs mt-1 opacity-60">Clique em "Gerar Revisão" para começar</p>
        </div>
      )}
    </div>
  )
}
