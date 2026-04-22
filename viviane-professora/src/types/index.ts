export type {
  User,
  Student,
  Observation,
  Report,
  LessonPlan,
  Activity,
  Communication,
  Correction,
  CalendarEvent,
  WeeklyAssessment,
  MonthlyAssessment,
  ApiUsage,
  AiInsight,
  ObservationCategory,
  ObservationSentiment,
  ReportPeriod,
  ReportStatus,
  LessonPlanStatus,
  ActivityType,
  ActivityDifficulty,
  CommunicationType,
  CommunicationStatus,
  CorrectionStatus,
  CalendarEventType,
} from "@/generated/prisma/client"

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }
