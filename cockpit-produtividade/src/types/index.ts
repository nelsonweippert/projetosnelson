import type {
  Task,
  TaskArea,
  Area,
  Subtask,
} from "@/generated/prisma/client"

export type {
  User,
  Area,
  Task,
  TaskArea,
  Subtask,
  Transaction,
  FinancialGoal,
  Reference,
  Content,
  ContentMetrics,
  AiInsight,
  CalendarEvent,
  TaskStatus,
  TaskPriority,
  Recurrence,
  TransactionType,
  PaymentMethod,
  ReferenceType,
  ReferenceStatus,
  ReferencePriority,
  Platform,
  ContentFormat,
  ContentPhase,
  EventType,
} from "@/generated/prisma/client"

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

export type CreateAreaInput = {
  name: string
  color?: string
  icon?: string
  description?: string
}

export type CreateTaskInput = {
  title: string
  description?: string
  notes?: string
  priority?: "LOW" | "MEDIUM" | "HIGH"
  dueDate?: Date | null
  estimatedMin?: number | null
  recurrence?: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY"
  areaIds?: string[]
}

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  status?: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED"
  completedAt?: Date | null
}

export type CreateTransactionInput = {
  type: "INCOME" | "EXPENSE"
  amount: number
  description: string
  category: string
  date: Date
  isFixed?: boolean
  payment?: "PIX" | "DEBIT" | "CREDIT" | "CASH" | "OTHER"
  notes?: string
  areaId?: string | null
}

export type CreateReferenceInput = {
  title: string
  url: string
  source?: string
  type?: "VIDEO" | "ARTICLE" | "BLOG" | "PODCAST" | "DOCUMENT" | "OTHER"
  priority?: "HIGH" | "NORMAL" | "LOW"
  tags?: string[]
  areaId?: string | null
}

export type CreateContentInput = {
  title: string
  platform?: "YOUTUBE" | "INSTAGRAM" | "TIKTOK" | "TWITCH" | "OTHER"
  format?: "LONG_VIDEO" | "SHORT" | "REELS" | "POST" | "LIVE" | "THREAD"
  hook?: string
  series?: string
  plannedDate?: Date | null
  areaId?: string | null
}

export type FinanceSummary = {
  totalIncome: number
  totalExpense: number
  balance: number
  savingsRate: number
  month: number
  year: number
}

export type TaskWithAreas = Task & { areas: (TaskArea & { area: Area })[]; subtasks: Subtask[] }

export type CalendarEventWithArea = CalendarEvent & { area: Area | null }

export type TaskWithDue = Task & { areas: (TaskArea & { area: Area })[] }

export type CreateCalendarEventInput = {
  title: string
  type?: "MEETING" | "ATA" | "ACTION" | "GENERAL"
  date: string
  endDate?: string
  description?: string
  location?: string
  attendees?: string[]
  notes?: string
  areaId?: string | null
}

export type UpdateCalendarEventInput = Partial<CreateCalendarEventInput>
