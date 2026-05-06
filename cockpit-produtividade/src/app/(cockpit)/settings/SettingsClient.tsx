"use client"

import { useState } from "react"
import {
  Settings, Cpu, Key, CheckCircle, AlertTriangle, Cloud, Terminal,
  Copy, ExternalLink, RefreshCcw, User,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Provider = "claude-api" | "claude-subscription"

interface Props {
  provider: Provider
  onVercel: boolean
  subscriptionAvailable: boolean
  claudeStatus:
    | { hasLogin: boolean; path: string; reason?: string }
    | null
  hasApiKey: boolean
  userEmail: string
}

export function SettingsClient({
  provider, onVercel, subscriptionAvailable, claudeStatus, hasApiKey, userEmail,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [liveStatus, setLiveStatus] = useState<typeof claudeStatus>(claudeStatus)

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  async function refreshStatus() {
    setRefreshing(true)
    try {
      const res = await fetch("/api/claude/status")
      if (res.ok) {
        const data = await res.json()
        if (data.hasLogin !== undefined) {
          setLiveStatus({
            hasLogin: data.hasLogin,
            path: data.path,
            reason: data.reason,
          })
        }
      }
    } finally {
      setRefreshing(false)
    }
  }

  const ready =
    provider === "claude-api"
      ? hasApiKey
      : (liveStatus ?? claudeStatus)?.hasLogin === true

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
          <Settings size={18} className="text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text">Configurações</h1>
          <p className="text-sm text-cockpit-muted">
            {userEmail}
          </p>
        </div>
      </div>

      {/* AI Provider card */}
      <div className="cockpit-card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-cockpit-text">Provedor de IA</h2>
          </div>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium",
              ready ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600",
            )}
          >
            {ready ? "✓ pronto" : "⚠ não configurado"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ProviderCard
            id="claude-api"
            active={provider === "claude-api"}
            title="Claude API Key"
            subtitle="Cobra por token consumido"
            icon={<Key size={14} />}
          />
          <ProviderCard
            id="claude-subscription"
            active={provider === "claude-subscription"}
            disabled={!subscriptionAvailable}
            title="Claude Subscription"
            subtitle={
              subscriptionAvailable
                ? "Usa sua assinatura Pro/Max — sem custo por chamada"
                : "Indisponível em Vercel (apenas dev local)"
            }
            icon={<Terminal size={14} />}
          />
        </div>

        <p className="text-[11px] text-cockpit-muted">
          Para alternar, defina <code className="px-1 py-0.5 bg-cockpit-border-light rounded text-[10px]">AI_PROVIDER</code> no <code className="px-1 py-0.5 bg-cockpit-border-light rounded text-[10px]">.env.local</code> e reinicie o servidor.
        </p>
      </div>

      {/* Provider-specific status */}
      {provider === "claude-api" && (
        <div className="cockpit-card space-y-3">
          <div className="flex items-center gap-2">
            <Key size={14} className="text-cockpit-muted" />
            <h3 className="text-sm font-semibold text-cockpit-text">Status — Claude API Key</h3>
          </div>

          {hasApiKey ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle size={14} />
              <span>ANTHROPIC_API_KEY definida</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle size={14} />
                <span>ANTHROPIC_API_KEY não encontrada</span>
              </div>
              <p className="text-xs text-cockpit-muted">
                Adicione no <code className="px-1 py-0.5 bg-cockpit-border-light rounded">.env.local</code>:
              </p>
              <CodeBlock value="ANTHROPIC_API_KEY=sk-ant-..." onCopy={(v) => copy(v, "api-key")} copied={copied === "api-key"} />
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                Console Anthropic <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>
      )}

      {provider === "claude-subscription" && (
        <div className="cockpit-card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-cockpit-muted" />
              <h3 className="text-sm font-semibold text-cockpit-text">Status — Claude Subscription</h3>
            </div>
            <button
              onClick={refreshStatus}
              disabled={refreshing}
              className="text-[11px] flex items-center gap-1 text-cockpit-muted hover:text-cockpit-text disabled:opacity-50"
            >
              <RefreshCcw size={11} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "verificando" : "verificar"}
            </button>
          </div>

          {(liveStatus ?? claudeStatus)?.hasLogin ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle size={14} />
                <span>Claude login detectado</span>
              </div>
              <p className="text-[11px] text-cockpit-muted font-mono break-all">
                {(liveStatus ?? claudeStatus)?.path}
              </p>
              <p className="text-xs text-cockpit-muted">
                Suas chamadas de IA agora consomem da sua assinatura Claude — sem cobrança extra por token.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle size={14} />
                <span>
                  Login não detectado
                  {(liveStatus ?? claudeStatus)?.reason ? ` (${(liveStatus ?? claudeStatus)?.reason})` : ""}
                </span>
              </div>
              <p className="text-xs text-cockpit-muted">
                Rode no terminal local (uma vez só):
              </p>
              <CodeBlock value="claude login" onCopy={(v) => copy(v, "login")} copied={copied === "login"} />
              <p className="text-[11px] text-cockpit-muted">
                Isso abre o browser pra OAuth com sua conta Anthropic. Tokens ficam em:
              </p>
              <p className="text-[11px] text-cockpit-muted font-mono break-all">
                {(liveStatus ?? claudeStatus)?.path}
              </p>
              <p className="text-[11px] text-cockpit-muted">
                Depois clica em "verificar" acima.
              </p>
              <a
                href="https://docs.anthropic.com/en/docs/claude-code/quickstart"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                Docs do Claude CLI <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Vercel info */}
      {onVercel && (
        <div className="cockpit-card border-l-4 border-l-blue-500 flex items-start gap-3">
          <Cloud size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-cockpit-text">Rodando em Vercel</h3>
            <p className="text-xs text-cockpit-muted mt-1">
              Provider <code className="px-1 py-0.5 bg-cockpit-border-light rounded">claude-subscription</code> não é suportado em runtime serverless (sem acesso ao home do user). Use API key.
            </p>
          </div>
        </div>
      )}

      {/* User card */}
      <div className="cockpit-card space-y-2">
        <div className="flex items-center gap-2">
          <User size={14} className="text-cockpit-muted" />
          <h3 className="text-sm font-semibold text-cockpit-text">Conta</h3>
        </div>
        <p className="text-sm text-cockpit-text">{userEmail}</p>
        <p className="text-[11px] text-cockpit-muted">
          App single-user — sem fluxo de criação de conta. Pra trocar credenciais, edite <code className="px-1 py-0.5 bg-cockpit-border-light rounded">prisma/seed.ts</code> e rode <code className="px-1 py-0.5 bg-cockpit-border-light rounded">npm run db:seed</code>.
        </p>
      </div>
    </div>
  )
}

function ProviderCard({
  id, active, disabled, title, subtitle, icon,
}: {
  id: string
  active: boolean
  disabled?: boolean
  title: string
  subtitle: string
  icon: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        active && "border-accent bg-accent/5",
        !active && !disabled && "border-cockpit-border bg-cockpit-surface",
        disabled && "border-cockpit-border bg-cockpit-border-light/30 opacity-60",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center",
          active ? "bg-accent/20 text-accent" : "bg-cockpit-border-light text-cockpit-muted",
        )}>
          {icon}
        </div>
        <span className="text-sm font-semibold text-cockpit-text">{title}</span>
        {active && <span className="ml-auto text-[10px] text-accent font-bold">ativo</span>}
      </div>
      <p className="text-[11px] text-cockpit-muted">{subtitle}</p>
      <p className="text-[10px] text-cockpit-muted mt-1 font-mono">AI_PROVIDER={id}</p>
    </div>
  )
}

function CodeBlock({
  value, onCopy, copied,
}: {
  value: string
  onCopy: (v: string) => void
  copied: boolean
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cockpit-border-light/40 font-mono text-xs">
      <span className="flex-1 text-cockpit-text break-all">{value}</span>
      <button
        onClick={() => onCopy(value)}
        className="text-cockpit-muted hover:text-accent shrink-0"
        title="Copiar"
      >
        {copied ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} />}
      </button>
    </div>
  )
}
