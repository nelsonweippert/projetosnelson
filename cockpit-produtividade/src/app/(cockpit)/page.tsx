import { CheckSquare, BookOpen, DollarSign, TrendingUp } from "lucide-react"
import Link from "next/link"

const modules = [
  {
    label: "Tarefas",
    description: "Gerencie suas tarefas por prioridade e status",
    href: "/tarefas",
    icon: CheckSquare,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    label: "Estudos",
    description: "Acompanhe cursos, horas estudadas e progresso",
    href: "/estudos",
    icon: BookOpen,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    label: "Financeiro",
    description: "Controle receitas, despesas e saldo mensal",
    href: "/financeiro",
    icon: DollarSign,
    color: "text-accent-dark",
    bg: "bg-accent/10",
  },
]

export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-cockpit-text">Dashboard</h1>
        <p className="text-sm text-cockpit-muted mt-1">Bem-vindo ao seu Cockpit de Produtividade</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <div className="cockpit-card flex flex-col gap-4 cursor-pointer hover:border-accent/30 transition-colors">
              <div className={`w-11 h-11 rounded-xl ${mod.bg} flex items-center justify-center`}>
                <mod.icon size={22} className={mod.color} />
              </div>
              <div>
                <p className="text-base font-semibold text-cockpit-text">{mod.label}</p>
                <p className="text-xs text-cockpit-muted mt-1 leading-relaxed">{mod.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="cockpit-card">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp size={18} className="text-accent" />
          <h2 className="text-sm font-semibold text-cockpit-text">Visão Geral</h2>
        </div>
        <p className="text-sm text-cockpit-muted">
          Seu painel de controle está pronto. Acesse os módulos acima para começar a registrar suas atividades.
        </p>
      </div>
    </div>
  )
}
