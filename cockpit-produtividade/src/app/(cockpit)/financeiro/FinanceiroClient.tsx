"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  Plus, TrendingUp, TrendingDown, DollarSign, Archive, X, Loader2,
  ChevronLeft, ChevronRight, Search, SlidersHorizontal, ArrowUpDown,
  Repeat, PiggyBank, BarChart3, CalendarRange,
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { createTransactionAction, archiveTransactionAction } from "@/app/actions/finance.actions"
import type { Area, TransactionType, PaymentMethod, FinanceSummary } from "@/types"
import { DatePicker } from "@/components/ui/DatePicker"

type Transaction = {
  id: string; type: TransactionType; amount: number; description: string
  category: string; date: Date | string; isFixed: boolean; payment: PaymentMethod
  notes?: string | null; area?: { id: string; name: string; color: string; icon: string } | null
}

type Projection = { month: number; year: number; income: number; expense: number; balance: number; accumulated: number }
type FixedItem = { id: string; type: TransactionType; description: string; amount: number; category: string; area?: any }

const PAYMENT_LABEL: Record<PaymentMethod, string> = { PIX: "Pix", DEBIT: "Débito", CREDIT: "Crédito", CASH: "Dinheiro", OTHER: "Outro" }
const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

type SortKey = "date" | "amount" | "category" | "description"
const SORT_LABEL: Record<SortKey, string> = { date: "Por data", amount: "Por valor", category: "Por categoria", description: "Alfabético" }
type Tab = "overview" | "transactions" | "projections" | "fixed"

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

interface Props { initialTransactions: Transaction[]; initialSummary: FinanceSummary; areas: Area[] }

export function FinanceiroClient({ initialTransactions, initialSummary, areas }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [summary, setSummary] = useState<FinanceSummary>(initialSummary)
  const [month, setMonth] = useState(initialSummary.month)
  const [year, setYear] = useState(initialSummary.year)
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>("overview")

  // Projections
  const [projections, setProjections] = useState<Projection[]>([])
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([])
  const [projData, setProjData] = useState<any>(null)
  const [loadingProj, setLoadingProj] = useState(false)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<TransactionType>("EXPENSE")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [isFixed, setIsFixed] = useState(false)
  const [payment, setPayment] = useState<PaymentMethod>("PIX")
  const [areaId, setAreaId] = useState("")

  // Filters
  const [search, setSearch] = useState("")
  const [typeFilters, setTypeFilters] = useState<TransactionType[]>([])
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortOpen, setSortOpen] = useState(false)
  const [onlyFixed, setOnlyFixed] = useState(false)

  const activeFilterCount = typeFilters.length + categoryFilters.length + (search ? 1 : 0) + (onlyFixed ? 1 : 0)

  useEffect(() => {
    if (!sortOpen) return
    const onClick = () => setSortOpen(false)
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [sortOpen])

  // Load projections on mount
  useEffect(() => {
    setLoadingProj(true)
    fetch("/api/finance/projections").then((r) => r.ok ? r.json() : null).then((data) => {
      if (data) { setProjections(data.projections); setFixedItems(data.fixedItems); setProjData(data) }
    }).finally(() => setLoadingProj(false))
  }, [])

  // ── Month navigation ──────────────────────────────────────────────────

  async function navigateMonth(delta: number) {
    let m = month + delta, y = year
    if (m > 12) { m = 1; y++ } else if (m < 1) { m = 12; y-- }
    setIsLoadingMonth(true); setMonth(m); setYear(y)
    try {
      const res = await fetch(`/api/finance?year=${y}&month=${m}`)
      if (res.ok) { const d = await res.json(); setTransactions(d.transactions ?? []); setSummary(d.summary) }
    } catch {}
    setIsLoadingMonth(false)
  }

  // ── Computed ───────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const t of transactions) cats.add(t.category)
    return Array.from(cats).sort()
  }, [transactions])

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {}
    for (const t of transactions) {
      if (!map[t.category]) map[t.category] = { income: 0, expense: 0 }
      if (t.type === "INCOME") map[t.category].income += t.amount
      else map[t.category].expense += t.amount
    }
    return Object.entries(map).sort(([, a], [, b]) => b.expense - a.expense)
  }, [transactions])

  const fixedTotal = useMemo(() => {
    const fixed = transactions.filter((t) => t.isFixed)
    return {
      income: fixed.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0),
      expense: fixed.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0),
    }
  }, [transactions])

  const filtered = useMemo(() => {
    let result = [...transactions]
    if (search) { const q = search.toLowerCase(); result = result.filter((t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) }
    if (typeFilters.length > 0) result = result.filter((t) => typeFilters.includes(t.type))
    if (categoryFilters.length > 0) result = result.filter((t) => categoryFilters.includes(t.category))
    if (onlyFixed) result = result.filter((t) => t.isFixed)
    switch (sortKey) {
      case "date": result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); break
      case "amount": result.sort((a, b) => b.amount - a.amount); break
      case "category": result.sort((a, b) => a.category.localeCompare(b.category)); break
      case "description": result.sort((a, b) => a.description.localeCompare(b.description)); break
    }
    return result
  }, [transactions, search, typeFilters, categoryFilters, onlyFixed, sortKey])

  // ── Handlers ───────────────────────────────────────────────────────────

  function resetForm() { setAmount(""); setDescription(""); setCategory(""); setDate(new Date().toISOString().split("T")[0]); setIsFixed(false); setPayment("PIX"); setAreaId(""); setShowForm(false) }
  function openForm(type: TransactionType) { setFormType(type); setShowForm(true) }
  function clearFilters() { setSearch(""); setTypeFilters([]); setCategoryFilters([]); setOnlyFixed(false); setSortKey("date") }

  function handleCreate() {
    if (!amount || !description.trim() || !category.trim()) return
    startTransition(async () => {
      const result = await createTransactionAction({ type: formType, amount: parseFloat(amount), description, category, date: new Date(date), isFixed, payment, areaId: areaId || null })
      if (result.success) { setTransactions((prev) => [result.data as Transaction, ...prev]); resetForm() }
    })
  }

  function handleArchive(id: string) {
    startTransition(async () => { const r = await archiveTransactionAction(id); if (r.success) setTransactions((prev) => prev.filter((t) => t.id !== id)) })
  }

  // ── Projection chart (text-based bar chart) ───────────────────────────

  const maxProjValue = useMemo(() => {
    if (projections.length === 0) return 1
    return Math.max(...projections.map((p) => Math.max(p.income, p.expense)), 1)
  }, [projections])

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header + month nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="p-2 text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-surface-hover rounded-xl transition-colors"><ChevronLeft size={18} /></button>
          <div>
            <h1 className="text-2xl font-bold text-cockpit-text">Financeiro</h1>
            <p className="text-sm text-cockpit-muted mt-0.5 capitalize">{MONTHS_FULL[month - 1]} {year}</p>
          </div>
          <button onClick={() => navigateMonth(1)} className="p-2 text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-surface-hover rounded-xl transition-colors"><ChevronRight size={18} /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openForm("INCOME")} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-600 text-sm font-semibold rounded-xl hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"><TrendingUp size={15} /> Receita</button>
          <button onClick={() => openForm("EXPENSE")} className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/20"><TrendingDown size={15} /> Despesa</button>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoadingMonth ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="cockpit-card h-20 animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="cockpit-card !py-3"><p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Receitas</p><p className="text-xl font-bold text-emerald-500 mt-1">{formatCurrency(summary.totalIncome)}</p></div>
          <div className="cockpit-card !py-3"><p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Despesas</p><p className="text-xl font-bold text-red-400 mt-1">{formatCurrency(summary.totalExpense)}</p></div>
          <div className="cockpit-card !py-3"><p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Saldo</p><p className={cn("text-xl font-bold mt-1", summary.balance >= 0 ? "text-emerald-500" : "text-red-400")}>{formatCurrency(summary.balance)}</p></div>
          <div className="cockpit-card !py-3"><p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Poupança</p><p className="text-xl font-bold text-accent mt-1">{summary.savingsRate.toFixed(1)}%</p></div>
          <div className="cockpit-card !py-3"><p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider flex items-center gap-1"><Repeat size={10} /> Fixos</p><p className="text-lg font-bold text-cockpit-text mt-1"><span className="text-emerald-500 text-sm">{formatCurrency(fixedTotal.income)}</span> <span className="text-red-400 text-sm">-{formatCurrency(fixedTotal.expense)}</span></p></div>
          <div className="cockpit-card !py-3"><p className="text-[11px] text-cockpit-muted font-medium uppercase tracking-wider">Lançamentos</p><p className="text-xl font-bold text-cockpit-text mt-1">{transactions.length}</p></div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-cockpit-border-light rounded-xl p-1 w-fit">
        {([
          { key: "overview" as Tab, label: "Visão geral", icon: BarChart3 },
          { key: "transactions" as Tab, label: "Lançamentos", icon: DollarSign },
          { key: "projections" as Tab, label: "Projeções", icon: CalendarRange },
          { key: "fixed" as Tab, label: "Recorrentes", icon: Repeat },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            tab === key ? "bg-cockpit-surface text-cockpit-text shadow-sm" : "text-cockpit-muted hover:text-cockpit-text"
          )}><Icon size={13} /> {label}</button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="cockpit-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={cn("text-sm font-semibold", formType === "INCOME" ? "text-emerald-500" : "text-red-500")}>{formType === "INCOME" ? "Nova Receita" : "Nova Despesa"}</h2>
            <button onClick={resetForm} className="p-1 text-cockpit-muted hover:text-cockpit-text rounded-lg"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-cockpit-muted mb-1.5">Valor (R$) *</label><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
            <div><label className="block text-xs text-cockpit-muted mb-1.5">Data *</label><DatePicker value={date} onChange={setDate} required /></div>
          </div>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição *" className="w-full px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs text-cockpit-muted mb-1.5">Categoria *</label><input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Alimentação" className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
            <div><label className="block text-xs text-cockpit-muted mb-1.5">Pagamento</label><select value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod)} className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"><option value="PIX">Pix</option><option value="DEBIT">Débito</option><option value="CREDIT">Crédito</option><option value="CASH">Dinheiro</option><option value="OTHER">Outro</option></select></div>
            <div><label className="block text-xs text-cockpit-muted mb-1.5">Área</label><select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="w-full px-3 py-2 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text focus:outline-none focus:ring-2 focus:ring-accent/30"><option value="">Nenhuma</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}</select></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} className="w-3.5 h-3.5 accent-accent rounded" /><span className="text-xs text-cockpit-muted">Gasto/receita fixa (recorrente mensal)</span></label>
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-cockpit-muted hover:text-cockpit-text border border-cockpit-border rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleCreate} disabled={!amount || !description.trim() || !category.trim() || isPending} className={cn("flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50", formType === "INCOME" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-red-500 text-white hover:bg-red-600")}>
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Salvar
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Category breakdown */}
          {categoryBreakdown.length > 0 && (
            <div className="cockpit-card">
              <h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider mb-4">Despesas por categoria</h3>
              <div className="space-y-3">
                {categoryBreakdown.filter(([, d]) => d.expense > 0).map(([cat, data]) => {
                  const pct = summary.totalExpense > 0 ? (data.expense / summary.totalExpense) * 100 : 0
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-cockpit-text">{cat}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-cockpit-muted">{pct.toFixed(1)}%</span>
                          <span className="text-sm font-semibold text-red-400">{formatCurrency(data.expense)}</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-cockpit-border-light rounded-full overflow-hidden">
                        <div className="h-full bg-red-500/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mini projection preview */}
          {projections.length > 0 && (
            <div className="cockpit-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider">Previsão dos próximos meses</h3>
                <button onClick={() => setTab("projections")} className="text-xs text-accent hover:underline">Ver completo</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {projections.slice(0, 6).map((p) => (
                  <div key={`${p.year}-${p.month}`} className="text-center">
                    <p className="text-[10px] text-cockpit-muted font-medium uppercase">{MONTHS_PT[p.month - 1]}</p>
                    <p className={cn("text-sm font-bold mt-1", p.balance >= 0 ? "text-emerald-500" : "text-red-400")}>{formatCurrency(p.balance)}</p>
                    <p className="text-[10px] text-cockpit-muted mt-0.5">Acum: {formatCurrency(p.accumulated)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: TRANSACTIONS ── */}
      {tab === "transactions" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cockpit-muted" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lançamentos..." className="w-full pl-9 pr-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-text placeholder:text-cockpit-muted focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <button onClick={() => setShowFilters((f) => !f)} className={cn("flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm transition-colors", showFilters || activeFilterCount > 0 ? "bg-accent/10 border-accent/30 text-accent" : "bg-cockpit-bg border-cockpit-border text-cockpit-muted hover:text-cockpit-text")}>
              <SlidersHorizontal size={15} /> Filtros{activeFilterCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 bg-accent text-black text-[10px] font-bold rounded-full">{activeFilterCount}</span>}
            </button>
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setSortOpen((o) => !o) }} className="flex items-center gap-1.5 px-3 py-2.5 bg-cockpit-bg border border-cockpit-border rounded-xl text-sm text-cockpit-muted hover:text-cockpit-text"><ArrowUpDown size={15} /><span className="hidden sm:inline">{SORT_LABEL[sortKey]}</span></button>
              {sortOpen && <div className="absolute right-0 top-12 z-50 bg-cockpit-surface border border-cockpit-border rounded-xl shadow-2xl overflow-hidden min-w-[160px]">{(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (<button key={k} onClick={(e) => { e.stopPropagation(); setSortKey(k); setSortOpen(false) }} className={cn("w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left hover:bg-cockpit-surface-hover", sortKey === k ? "text-accent font-medium" : "text-cockpit-muted")}>{SORT_LABEL[k]}</button>))}</div>}
            </div>
          </div>

          {showFilters && (
            <div className="cockpit-card space-y-4">
              <div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider">Filtros</h3>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-cockpit-muted hover:text-red-400">Limpar</button>}</div>
              <div>
                <p className="text-[11px] text-cockpit-muted font-medium mb-2">Tipo</p>
                <div className="flex gap-1.5">
                  {(["INCOME", "EXPENSE"] as TransactionType[]).map((t) => (
                    <button key={t} onClick={() => setTypeFilters((f) => toggle(f, t))} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", typeFilters.includes(t) ? t === "INCOME" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500" : "border-red-500/40 bg-red-500/10 text-red-400" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30")}>{t === "INCOME" ? "Receitas" : "Despesas"}</button>
                  ))}
                  <button onClick={() => setOnlyFixed(!onlyFixed)} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", onlyFixed ? "border-accent/40 bg-accent/10 text-accent" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30")}><Repeat size={11} /> Apenas fixos</button>
                </div>
              </div>
              {categories.length > 0 && (
                <div>
                  <p className="text-[11px] text-cockpit-muted font-medium mb-2">Categoria</p>
                  <div className="flex flex-wrap gap-1.5">{categories.map((c) => (
                    <button key={c} onClick={() => setCategoryFilters((f) => toggle(f, c))} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", categoryFilters.includes(c) ? "border-accent/40 bg-accent/10 text-accent" : "border-cockpit-border text-cockpit-muted hover:border-cockpit-text/30")}>{c}</button>
                  ))}</div>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-cockpit-muted">{filtered.length} lançamento{filtered.length !== 1 ? "s" : ""}</p>

          <div className="cockpit-card !p-0 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-cockpit-muted"><DollarSign size={32} strokeWidth={1} /><p className="text-sm mt-3">Nenhum lançamento</p></div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-cockpit-border">
                  <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-5 py-3">Tipo</th>
                  <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-3 py-3">Descrição</th>
                  <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-3 py-3 hidden sm:table-cell">Categoria</th>
                  <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-3 py-3 hidden md:table-cell">Data</th>
                  <th className="text-right text-[11px] font-semibold text-cockpit-muted uppercase tracking-wider px-5 py-3">Valor</th>
                  <th className="px-3 py-3"></th>
                </tr></thead>
                <tbody>{filtered.map((t) => (
                  <tr key={t.id} className="border-b border-cockpit-border-light hover:bg-cockpit-surface-hover transition-colors group">
                    <td className="px-5 py-3.5"><div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", t.type === "INCOME" ? "bg-emerald-500/10" : "bg-red-500/10")}>{t.type === "INCOME" ? <TrendingUp size={13} className="text-emerald-500" /> : <TrendingDown size={13} className="text-red-500" />}</div></td>
                    <td className="px-3 py-3.5"><p className="text-sm font-medium text-cockpit-text line-clamp-1">{t.description}</p><div className="flex gap-1.5 mt-0.5"><span className="text-[10px] text-cockpit-muted">{PAYMENT_LABEL[t.payment]}</span>{t.isFixed && <span className="text-[10px] text-accent flex items-center gap-0.5"><Repeat size={8} /> Fixo</span>}{t.area && <span className="text-[10px]" style={{ color: t.area.color }}>{t.area.icon} {t.area.name}</span>}</div></td>
                    <td className="px-3 py-3.5 hidden sm:table-cell"><span className="text-xs text-cockpit-muted">{t.category}</span></td>
                    <td className="px-3 py-3.5 hidden md:table-cell"><span className="text-xs text-cockpit-muted">{formatDate(t.date)}</span></td>
                    <td className="px-5 py-3.5 text-right"><span className={cn("text-sm font-semibold", t.type === "INCOME" ? "text-emerald-500" : "text-red-500")}>{t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}</span></td>
                    <td className="px-3 py-3.5"><button onClick={() => handleArchive(t.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-cockpit-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-all"><Archive size={13} /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: PROJECTIONS ── */}
      {tab === "projections" && (
        <div className="space-y-5">
          {loadingProj ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-cockpit-muted" /></div>
          ) : projections.length === 0 ? (
            <div className="cockpit-card py-16 text-center text-cockpit-muted"><CalendarRange size={32} strokeWidth={1} className="mx-auto" /><p className="text-sm mt-3">Adicione transações recorrentes para gerar projeções</p></div>
          ) : (
            <>
              {/* Projection basis */}
              {projData && (
                <div className="cockpit-card">
                  <h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider mb-3">Base da projeção</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div><p className="text-[10px] text-cockpit-muted uppercase">Receita fixa</p><p className="text-lg font-bold text-emerald-500">{formatCurrency(projData.fixedIncome)}</p></div>
                    <div><p className="text-[10px] text-cockpit-muted uppercase">Despesa fixa</p><p className="text-lg font-bold text-red-400">{formatCurrency(projData.fixedExpense)}</p></div>
                    <div><p className="text-[10px] text-cockpit-muted uppercase">Receita variável (média)</p><p className="text-lg font-bold text-emerald-500/70">{formatCurrency(projData.avgVariableIncome)}</p></div>
                    <div><p className="text-[10px] text-cockpit-muted uppercase">Despesa variável (média)</p><p className="text-lg font-bold text-red-400/70">{formatCurrency(projData.avgVariableExpense)}</p></div>
                  </div>
                </div>
              )}

              {/* 12-month projection table */}
              <div className="cockpit-card !p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-cockpit-border"><h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider">Projeção 12 meses</h3></div>
                <table className="w-full">
                  <thead><tr className="border-b border-cockpit-border">
                    <th className="text-left text-[11px] font-semibold text-cockpit-muted uppercase px-5 py-2.5">Mês</th>
                    <th className="text-right text-[11px] font-semibold text-cockpit-muted uppercase px-3 py-2.5">Receita</th>
                    <th className="text-right text-[11px] font-semibold text-cockpit-muted uppercase px-3 py-2.5">Despesa</th>
                    <th className="text-right text-[11px] font-semibold text-cockpit-muted uppercase px-3 py-2.5">Saldo</th>
                    <th className="text-right text-[11px] font-semibold text-cockpit-muted uppercase px-5 py-2.5">Acumulado</th>
                    <th className="px-3 py-2.5 hidden sm:table-cell w-32"></th>
                  </tr></thead>
                  <tbody>{projections.map((p) => (
                    <tr key={`${p.year}-${p.month}`} className="border-b border-cockpit-border-light hover:bg-cockpit-surface-hover">
                      <td className="px-5 py-3 text-sm text-cockpit-text font-medium">{MONTHS_PT[p.month - 1]} {p.year}</td>
                      <td className="px-3 py-3 text-right text-sm text-emerald-500">{formatCurrency(p.income)}</td>
                      <td className="px-3 py-3 text-right text-sm text-red-400">{formatCurrency(p.expense)}</td>
                      <td className="px-3 py-3 text-right"><span className={cn("text-sm font-semibold", p.balance >= 0 ? "text-emerald-500" : "text-red-400")}>{formatCurrency(p.balance)}</span></td>
                      <td className="px-5 py-3 text-right"><span className={cn("text-sm font-bold", p.accumulated >= 0 ? "text-accent" : "text-red-400")}>{formatCurrency(p.accumulated)}</span></td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <div className="flex h-3 gap-0.5 rounded overflow-hidden">
                          <div className="bg-emerald-500/40 rounded-l" style={{ width: `${(p.income / maxProjValue) * 100}%` }} />
                          <div className="bg-red-500/40 rounded-r" style={{ width: `${(p.expense / maxProjValue) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: FIXED/RECURRING ── */}
      {tab === "fixed" && (
        <div className="space-y-5">
          {loadingProj ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-cockpit-muted" /></div>
          ) : fixedItems.length === 0 ? (
            <div className="cockpit-card py-16 text-center text-cockpit-muted"><Repeat size={32} strokeWidth={1} className="mx-auto" /><p className="text-sm mt-3">Nenhum lançamento recorrente</p><p className="text-xs mt-1">Marque "Gasto/receita fixa" ao criar um lançamento</p></div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="cockpit-card !py-3"><p className="text-[11px] text-cockpit-muted font-medium uppercase">Receita fixa mensal</p><p className="text-xl font-bold text-emerald-500 mt-1">{formatCurrency(projData?.fixedIncome ?? 0)}</p></div>
                <div className="cockpit-card !py-3"><p className="text-[11px] text-cockpit-muted font-medium uppercase">Despesa fixa mensal</p><p className="text-xl font-bold text-red-400 mt-1">{formatCurrency(projData?.fixedExpense ?? 0)}</p></div>
                <div className="cockpit-card !py-3"><p className="text-[11px] text-cockpit-muted font-medium uppercase">Resultado fixo</p><p className={cn("text-xl font-bold mt-1", (projData?.fixedIncome ?? 0) - (projData?.fixedExpense ?? 0) >= 0 ? "text-emerald-500" : "text-red-400")}>{formatCurrency((projData?.fixedIncome ?? 0) - (projData?.fixedExpense ?? 0))}</p></div>
              </div>

              <div className="cockpit-card !p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-cockpit-border"><h3 className="text-xs font-semibold text-cockpit-text uppercase tracking-wider">Itens recorrentes ({fixedItems.length})</h3></div>
                <div className="divide-y divide-cockpit-border-light">
                  {fixedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-cockpit-surface-hover transition-colors">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", item.type === "INCOME" ? "bg-emerald-500/10" : "bg-red-500/10")}>
                        {item.type === "INCOME" ? <TrendingUp size={13} className="text-emerald-500" /> : <TrendingDown size={13} className="text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cockpit-text truncate">{item.description}</p>
                        <p className="text-[10px] text-cockpit-muted">{item.category}{item.area ? ` · ${item.area.icon} ${item.area.name}` : ""}</p>
                      </div>
                      <span className={cn("text-sm font-semibold flex-shrink-0", item.type === "INCOME" ? "text-emerald-500" : "text-red-400")}>
                        {item.type === "INCOME" ? "+" : "-"}{formatCurrency(item.amount)}/mês
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
