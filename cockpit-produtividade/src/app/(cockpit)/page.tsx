import { auth } from "@/lib/auth"
import { getTaskStats } from "@/services/task.service"
import { getStudyStats } from "@/services/study.service"
import { getFinanceSummary } from "@/services/finance.service"
import { CheckSquare, BookOpen, DollarSign, TrendingUp, TrendingDown, Clock, Target } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatHours } from "@/lib/utils"

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id!

  const [taskStats, studyStats, finance] = await Promise.all([
    getTaskStats(userId),
    getStudyStats(userId),
    getFinanceSummary(userId),
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
      trend: taskStats.done > 0 ? "up" : "neutral",
    },
    {
      label: "Estudos em andamento",
      value: String(studyStats.inProgress),
      sub: `${formatHours(studyStats.doneHours)} estudadas`,
      icon: BookOpen,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      href: "/estudos",
      trend: studyStats.doneHours > 0 ? "up" : "neutral",
    },
    {
      label: "Receita do mês",
      value: formatCurrency(finance.totalIncome),
      sub: `${formatCurrency(finance.totalExpense)} em gastos`,
      icon: TrendingUp,
      color: "text-accent-dark",
      bg: "bg-accent/10",
      href: "/financeiro",
      trend: finance.balance >= 0 ? "up" : "down",
    },
    {
      label: "Saldo atual",
      value: formatCurrency(finance.balance),
      sub: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      icon: finance.balance >= 0 ? TrendingUp : TrendingDown,
      color: finance.balance >= 0 ? "text-emerald-500" : "text-red-500",
      bg: finance.balance >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
      href: "/financeiro",
      trend: finance.balance >= 0 ? "up" : "down",
    },
  ]

  const quickLinks = [
    { label: "Nova Tarefa", href: "/tarefas?new=1", icon: CheckSquare },
    { label: "Novo Estudo", href: "/estudos?new=1", icon: BookOpen },
    { label: "Registrar Receita", href: "/financeiro?new=income", icon: TrendingUp },
    { label: "Registrar Gasto", href: "/financeiro?new=expense", icon: TrendingDown },
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
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
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

      {/* Progresso Tarefas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                { label: "A fazer", count: taskStats.todo, color: "bg-cockpit-border", total: taskStats.total },
                { label: "Em andamento", count: taskStats.inProgress, color: "bg-amber-400", total: taskStats.total },
                { label: "Concluídas", count: taskStats.done, color: "bg-emerald-500", total: taskStats.total },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-cockpit-muted">{item.label}</span>
                    <span className="text-cockpit-text font-medium">{item.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-cockpit-border-light rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: item.total > 0 ? `${(item.count / item.total) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cockpit-card space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-purple-500" />
            <h2 className="text-sm font-semibold text-cockpit-text">Progresso dos Estudos</h2>
          </div>
          {studyStats.total === 0 ? (
            <p className="text-sm text-cockpit-muted">Nenhum estudo cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Total de cursos", count: studyStats.total, color: "bg-purple-400", total: studyStats.total },
                { label: "Em andamento", count: studyStats.inProgress, color: "bg-amber-400", total: studyStats.total },
                { label: "Concluídos", count: studyStats.completed, color: "bg-emerald-500", total: studyStats.total },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-cockpit-muted">{item.label}</span>
                    <span className="text-cockpit-text font-medium">{item.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-cockpit-border-light rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: item.total > 0 ? `${(item.count / item.total) * 100}%` : "0%" }}
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
            <Link key={link.href} href={link.href}>
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
