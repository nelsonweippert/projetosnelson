import type {
  Task,
  TaskStatus,
  TaskPriority,
  Study,
  StudyStatus,
  StudySession,
  Expense,
  Income,
  TransactionCategory,
} from "@/generated/prisma/client"

// ── Re-exports ──────────────────────────────────────────────────────────────
export type {
  Task,
  TaskStatus,
  TaskPriority,
  Study,
  StudyStatus,
  StudySession,
  Expense,
  Income,
  TransactionCategory,
}

// ── Tasks ────────────────────────────────────────────────────────────────────
export type CreateTaskInput = {
  title: string
  description?: string
  priority?: TaskPriority
  dueDate?: Date | null
  tags?: string[]
}

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  status?: TaskStatus
}

export type TaskWithMeta = Task

// ── Studies ──────────────────────────────────────────────────────────────────
export type CreateStudyInput = {
  title: string
  description?: string
  category: string
  totalHours?: number
  link?: string
}

export type UpdateStudyInput = Partial<CreateStudyInput> & {
  status?: StudyStatus
  doneHours?: number
}

export type StudyWithSessions = Study & {
  sessions: StudySession[]
}

export type CreateStudySessionInput = {
  studyId: string
  hours: number
  note?: string
  date?: Date
}

// ── Finance ──────────────────────────────────────────────────────────────────
export type CreateExpenseInput = {
  description: string
  amount: number
  category: TransactionCategory
  date: Date
  recurring?: boolean
}

export type CreateIncomeInput = {
  description: string
  amount: number
  category: TransactionCategory
  date: Date
  recurring?: boolean
}

export type FinanceSummary = {
  totalIncome: number
  totalExpense: number
  balance: number
  month: number
  year: number
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export type DashboardStats = {
  tasks: { todo: number; inProgress: number; done: number; total: number }
  studies: { total: number; inProgress: number; completed: number; doneHours: number }
  finance: FinanceSummary
}

// ── Action Result ─────────────────────────────────────────────────────────────
export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }
