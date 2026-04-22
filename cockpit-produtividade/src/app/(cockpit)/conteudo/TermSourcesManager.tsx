"use client"

import { useState, useTransition } from "react"
import { Loader2, Search, X, Plus, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { discoverSourcesForTermAction, updateTermSourcesAction } from "@/app/actions/idea.actions"

export type TermSource = {
  host: string
  name: string
  tier: "TIER_1" | "TIER_2" | "BLOG"
  language: "pt-BR" | "en" | "es"
  note?: string
  isActive: boolean
}

function tierBadge(tier: TermSource["tier"]) {
  if (tier === "TIER_1") return { text: "TIER 1", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" }
  if (tier === "TIER_2") return { text: "TIER 2", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" }
  return { text: "BLOG", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" }
}

function langFlag(l: string) {
  return l === "pt-BR" ? "🇧🇷" : l === "en" ? "🇺🇸" : l === "es" ? "🇪🇸" : "🌐"
}

interface Props {
  termId: string
  sources: TermSource[]
  onSourcesChange: (sources: TermSource[]) => void
}

export function TermSourcesManager({ termId, sources, onSourcesChange }: Props) {
  const [discovering, setDiscovering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingHost, setAddingHost] = useState("")
  const [, startTransition] = useTransition()

  const activeCount = sources.filter((s) => s.isActive).length

  async function handleDiscover() {
    setDiscovering(true)
    setError(null)
    try {
      const res = await discoverSourcesForTermAction(termId)
      if (res.success) {
        const updated = res.data as { sources: TermSource[] }
        const newSources = (Array.isArray(updated?.sources) ? updated.sources : []) as TermSource[]
        onSourcesChange(newSources)
      } else {
        setError(res.error || "Erro ao descobrir fontes")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado")
    } finally {
      setDiscovering(false)
    }
  }

  async function persistSources(newSources: TermSource[]) {
    onSourcesChange(newSources)
    startTransition(async () => {
      await updateTermSourcesAction(termId, newSources as unknown as unknown[])
    })
  }

  function handleToggle(host: string) {
    persistSources(sources.map((s) => s.host === host ? { ...s, isActive: !s.isActive } : s))
  }

  function handleRemove(host: string) {
    persistSources(sources.filter((s) => s.host !== host))
  }

  function handleAddManual() {
    const clean = addingHost.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+.*$/, "")
    if (!clean || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(clean)) {
      setError("Host inválido. Ex: folha.uol.com.br")
      return
    }
    if (sources.find((s) => s.host === clean)) {
      setError("Fonte já cadastrada")
      return
    }
    const manual: TermSource = {
      host: clean, name: clean,
      tier: "TIER_2", language: clean.endsWith(".br") || clean.includes(".com.br") ? "pt-BR" : "en",
      note: "Adicionada manualmente", isActive: true,
    }
    persistSources([...sources, manual])
    setAddingHost("")
    setError(null)
  }

  return (
    <div className="mt-2 space-y-2 border-t border-cockpit-border pt-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-cockpit-muted">
          {sources.length > 0 ? (
            <>
              <span className="font-semibold text-cockpit-text">{activeCount}</span>/{sources.length} fonte{sources.length === 1 ? "" : "s"} ativa{activeCount === 1 ? "" : "s"}
            </>
          ) : (
            <span className="italic">Sem fontes curadas — pesquisa usa Google News RSS</span>
          )}
        </div>
        <button onClick={handleDiscover} disabled={discovering}
          className="flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent text-[11px] font-semibold border border-accent/20 rounded-lg hover:bg-accent/20 disabled:opacity-50 transition-colors">
          {discovering ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
          {discovering ? "Pesquisando..." : sources.length > 0 ? "Atualizar fontes" : "Pesquisar fontes"}
        </button>
      </div>

      {error && (
        <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400">
          {error}
        </div>
      )}

      {sources.length > 0 && (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {sources.map((s) => {
            const tier = tierBadge(s.tier)
            return (
              <div key={s.host} className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[11px]",
                s.isActive ? "border-cockpit-border bg-cockpit-bg" : "border-cockpit-border-light bg-cockpit-border-light/20 opacity-60"
              )}>
                <button onClick={() => handleToggle(s.host)}
                  title={s.isActive ? "Desativar" : "Ativar"}
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                    s.isActive ? "bg-accent border-accent text-black" : "bg-cockpit-bg border-cockpit-border text-transparent hover:border-accent/40"
                  )}>
                  {s.isActive && <Check size={10} strokeWidth={3} />}
                </button>
                <span className={cn("px-1.5 py-0.5 text-[9px] font-bold border rounded", tier.cls)}>{tier.text}</span>
                <span className="text-[11px]">{langFlag(s.language)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-cockpit-text truncate">{s.name}</span>
                    <span className="text-[9px] text-cockpit-muted truncate">{s.host}</span>
                  </div>
                  {s.note && <p className="text-[10px] text-cockpit-muted truncate">{s.note}</p>}
                </div>
                <button onClick={() => handleRemove(s.host)} title="Remover"
                  className="p-0.5 text-cockpit-muted hover:text-red-400 rounded shrink-0">
                  <X size={11} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add manual */}
      <div className="flex items-center gap-1.5">
        <input type="text" value={addingHost} onChange={(e) => setAddingHost(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddManual() }}
          placeholder="Adicionar manual: folha.uol.com.br"
          className="flex-1 px-2 py-1 bg-cockpit-bg border border-cockpit-border rounded-lg text-[11px] text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-1 focus:ring-accent/30" />
        <button onClick={handleAddManual} disabled={!addingHost.trim()}
          className="px-2 py-1 text-cockpit-muted hover:text-accent disabled:opacity-50">
          <Plus size={12} />
        </button>
      </div>
    </div>
  )
}
