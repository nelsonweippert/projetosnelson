import { auth } from "@/lib/auth"
import { getTaskStats } from "@/services/task.service"
import { getReferenceStats } from "@/services/reference.service"
import { getFinanceSummary } from "@/services/finance.service"
import { getContentStats } from "@/services/content.service"
import { CheckSquare, BookOpen, DollarSign, TrendingUp, TrendingDown, Target, Video } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id!

  const [taskStats, refStats, finance, contentStats] = await Promise.all([
    getTaskStats(userId),
    getReferenceStats(userId),
    getFinanceSummary(userId),
    getContentStats(userId),
  ])

  const stats = [
    {
      label: "Tarefas pendentes",
      value: String(taskStats.todo + taskStats.inProgress),
      sub: `${taskStats.done} concluídas`,
      icon: CheckSquare,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/tarefas",
    },
    {
      label: "Referências para ler",
      value: String(refStats.unread + refStats.reading),
      sub: `${refStats.read} lidas`,
      icon: BookOpen,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      href: "/estudos",
    },
    {
      label: "Receita do mês",
      value: formatCurrency(finance.totalIncome),
      sub: `${formatCurrency(finance.totalExpense)} em gastos`,
      icon: TrendingUp,
      color: "text-accent-dark",
      bg: "bg-accent/10",
      href: "/financeiro",
    },
    {
      label: "Saldo atual",
      value: formatCurrency(finance.balance),
      sub: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      icon: finance.balance >= 0 ? TrendingUp : TrendingDown,
      color: finance.balance >= 0 ? "text-emerald-500" : "text-red-500",
      bg: finance.balance >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
      href: "/financeiro",
    },
  ]

  const quickLinks = [
    { label: "Nova Tarefa", href: "/tarefas", icon: CheckSquare },
    { label: "Nova Referência", href: "/estudos", icon: BookOpen },
    { label: "Registrar Receita", href: "/financeiro", icon: TrendingUp },
    { label: "Registrar Gasto", href: "/financeiro", icon: TrendingDown },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-cockpit-text">Dashboard</h1>
        <p className="text-sm text-cockpit-muted mt-1">
          Olá, {session?.user?.name?.split(" ")[0]}. Aqui está seu resumo de hoje.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="cockpit-card flex flex-col gap-3 cursor-pointer hover:border-accent/30 transition-colors">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-cockpit-text">{stat.value}</p>
                <p className="text-xs text-cockpit-muted mt-0.5">{stat.label}</p>
                <p className="text-[11px] text-cockpit-muted mt-1 opacity-70">{stat.sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tasks */}
        <div className="cockpit-card space-y-4">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-cockpit-text">Progresso das Tarefas</h2>
          </div>
          {taskStats.total === 0 ? (
            <p className="text-sm text-cockpit-muted">Nenhuma tarefa cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "A fazer", count: taskStats.todo, color: "bg-cockpit-border" },
                { label: "Em andamento", count: taskStats.inProgress, color: "bg-amber-400" },
                { label: "Concluídas", count: taskStats.done, color: "bg-emerald-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-cockpit-muted">{item.label}</span>
                    <span className="text-cockpit-text font-medium">{item.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-cockpit-border-light rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: taskStats.total > 0 ? `${(item.count / taskStats.total) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="cockpit-card space-y-4">
          <div className="flex items-center gap-2">
            <Video size={16} className="text-red-500" />
            <h2 className="text-sm font-semibold text-cockpit-text">Pipeline de Conteúdo</h2>
          </div>
          {contentStats.total === 0 ? (
            <p className="text-sm text-cockpit-muted">Nenhum conteúdo cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Ideias", count: contentStats.ideas, color: "bg-blue-400" },
                { label: "Em produção", count: contentStats.inProduction, color: "bg-amber-400" },
                { label: "Publicados", count: contentStats.published, color: "bg-emerald-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-cockpit-muted">{item.label}</span>
                    <span className="text-cockpit-text font-medium">{item.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-cockpit-border-light rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: contentStats.total > 0 ? `${(item.count / contentStats.total) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="cockpit-card">
        <h2 className="text-sm font-semibold text-cockpit-text mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((link) => (
            <Link key={link.href + link.label} href={link.href}>
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-cockpit-border hover:border-accent/40 hover:bg-accent/5 transition-all cursor-pointer">
                <link.icon size={15} className="text-cockpit-muted" />
                <span className="text-xs font-medium text-cockpit-text">{link.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
