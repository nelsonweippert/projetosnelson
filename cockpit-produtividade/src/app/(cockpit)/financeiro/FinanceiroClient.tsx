"use client"

import { useState, useTransition } from "react"
import { Plus, TrendingUp, TrendingDown, DollarSign, Archive, X, Loader2 } from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { createTransactionAction, archiveTransactionAction } from "@/app/actions/finance.actions"
import type { Area, TransactionType, PaymentMethod, FinanceSummary } from "@/types"

type Transaction = {
  id: string
  type: TransactionType
  amount: number
  description: string
  category: string
  date: Date | string
  isFixed: boolean
  payment: PaymentMethod
  notes?: string | null
  area?: { id: string; name: string; color: string; icon: string } | null
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PIX: "Pix",
  DEBIT: "Débito",
  CREDIT: "Crédito",
  CASH: "Dinheiro",
  OTHER: "Outro",
}

interface Props {
  initialTransactions: Transaction[]
  initialSummary: FinanceSummary
  areas: Area[]
}

export function FinanceiroClient({ initialTransactions, initialSummary, areas }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [summary] = useState<FinanceSummary>(initialSummary)
  const [filter, setFilter] = useState<TransactionType | "ALL">("ALL")
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<TransactionType>("EXPENSE")
  const [isPending, startTransition] = useTransition()

  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [isFixed, setIsFixed] = useState(false)
  const [payment, setPayment] = useState<PaymentMethod>("PIX")
  const [notes, setNotes] = useState("")
  const [areaId, setAreaId] = useState("")

  const filtered = filter === "ALL" ? transactions : transactions.filter((t) => t.type === filter)

  function resetForm() {
    setAmount(""); setDescription(""); setCategory("")
    setDate(new Date().toISOString().split("T")[0]); setIsFixed(false)
    setPayment("PIX"); setNotes(""); setAreaId("")
    setShowForm(false)
  }

  function openForm(type: TransactionType) {
    setFormType(type)
    setShowForm(true)
  }

  function handleCreate() {
    if (!amount || !description.trim() || !category.trim()) return
    startTransition(async () => {
      const result = await createTransactionAction({
        type: formType,
        amount: parseFloat(amount),
        description,
        category,
        date: new Date(date),
        isFixed,
        payment,
        notes: notes || undefined,
        areaId: areaId || null,
      })
      if (result.success) {
        setTransactions((prev) => [result.data as Transaction, ...prev])
        resetForm()
      }
    })
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveTransactionAction(id)
      if (result.success) setTransactions((prev) => prev.filter((t) => t.id !== id))
    })
  }

  const monthName = new Date(summary.year, summary.month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text">Financeiro</h1>
          <p className="text-sm text-cockpit-muted mt-1 capitalize">{monthName}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openForm("INCOME")}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-600 text-sm font-semibold rounded-xl hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
            <TrendingUp size={15} /> Receita
          </button>
          <button onClick={() => openForm("EXPENSE")}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/20">
            <TrendingDown size={15} /> Despesa
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Receitas", value: formatCurrency(summary.totalIncome), color: "text-emerald-500", bg: "bg-emerald-500/10", icon: TrendingUp },
          { label: "Despesas", value: formatCurrency(summary.totalExpense), color: "text-red-500", bg: "bg-red-500/10", icon: TrendingDown },
          {
            label: "Saldo", value: formatCurrency(summary.balance),
            color: summary.balance >= 0 ? "text-emerald-500" : "text-red-500",
            bg: summary.balance >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
            icon: DollarSign,
          },
          { label: "Taxa de poupança", value: `${summary.savingsRate.toFixed(1)}%`, color: "text-accent-dark", bg: "bg-accent/10", icon: DollarSign },
        ].map((card) => (
          <div key={card.label} className="cockpit-card">
            <div className={`w-8 h-8 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon size={16} className={card.color} />
            </div>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-cockpit-muted mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="cockpit-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={cn("text-sm font-semibold", formType === "INCOME" ? "text-emerald-500" : "text-red-500")}>
              {formType === "INCOME" ? "Nova Receita" : "Nova Despesa"}
            </h2>
            <button onClick={resetForm} className="p-1 text-cockpit-muted hover:text-cockpit-text rounded-lg">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Valor (R$) *</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Data *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>

          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição *"
            className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Categoria *</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Alimentação"
                className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Pagamento</label>
              <select value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="PIX">Pix</option>
                <option value="DEBIT">Débito</option>
                <option value="CREDIT">Crédito</option>
                <option value="CASH">Dinheiro</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-cockpit-muted mb-1.5">Área</label>
              <select value={areaId} onChange={(e) => setAreaId(e.target.value)}
                className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="">Nenhuma</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isFixed} onChange={(e) => setIsFixed(e.target.checked)}
                className="w-3.5 h-3.5 accent-accent rounded" />
              <span className="text-xs text-cockpit-muted">Gasto fixo (recorrente)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!amount || !description.trim() || !category.trim() || isPending}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50",
                formType === "INCOME" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-red-500 text-white hover:bg-red-600"
              )}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-1 bg-cockpit-border-light rounded-xl p-1 w-fit">
        {(["ALL", "INCOME", "EXPENSE"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === f ? "bg-cockpit-surface text-cockpit-text shadow-sm" : "text-cockpit-muted hover:text-cockpit-text")}>
            {f === "ALL" ? "Todos" : f === "INCOME" ? "Receitas" : "Despesas"}
            <span className="ml-1.5 text-[10px] opacity-70">
              {f === "ALL" ? transactions.length : transactions.filter((t) => t.type === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="cockpit-card !p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-cockpit-muted">
            <DollarSign size={32} strokeWidth={1} />
            <p className="text-sm mt-3">Nenhum lançamento encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-cockpit-border">
                <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-5 py-3">Tipo</th>
                <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-3 py-3">Descrição</th>
                <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-3 py-3 hidden sm:table-cell">Categoria</th>
                <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-3 py-3 hidden md:table-cell">Data</th>
                <th className="text-right text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-5 py-3">Valor</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-cockpit-border-light hover:bg-cockpit-surface-hover transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center",
                      t.type === "INCOME" ? "bg-emerald-500/10" : "bg-red-500/10")}>
                      {t.type === "INCOME"
                        ? <TrendingUp size={13} className="text-emerald-500" />
                        : <TrendingDown size={13} className="text-red-500" />}
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <p className="text-sm font-medium text-cockpit-text line-clamp-1">{t.description}</p>
                    <div className="flex gap-1.5 mt-0.5">
                      <span className="text-[10px] text-cockpit-muted">{PAYMENT_LABEL[t.payment]}</span>
                      {t.isFixed && <span className="text-[10px] text-cockpit-muted">· Fixo</span>}
                      {t.area && <span className="text-[10px]" style={{ color: t.area.color }}>{t.area.icon} {t.area.name}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 hidden sm:table-cell">
                    <span className="text-xs text-cockpit-muted">{t.category}</span>
                  </td>
                  <td className="px-3 py-3.5 hidden md:table-cell">
                    <span className="text-xs text-cockpit-muted">{formatDate(t.date)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={cn("text-sm font-semibold", t.type === "INCOME" ? "text-emerald-500" : "text-red-500")}>
                      {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <button onClick={() => handleArchive(t.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-all">
                      <Archive size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
