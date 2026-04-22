-- CreateEnum
CREATE TYPE "ObservationCategory" AS ENUM ('BEHAVIOR', 'ACADEMIC', 'SOCIAL', 'EMOTIONAL', 'HEALTH', 'PARTICIPATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ObservationSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'CONCERN', 'URGENT');

-- CreateEnum
CREATE TYPE "ReportPeriod" AS ENUM ('BIMESTER_1', 'BIMESTER_2', 'BIMESTER_3', 'BIMESTER_4', 'SEMESTER_1', 'SEMESTER_2', 'ANNUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'REVIEWED', 'FINAL');

-- CreateEnum
CREATE TYPE "LessonPlanStatus" AS ENUM ('PLANNED', 'TAUGHT', 'REVIEWED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('EXERCISE', 'ASSESSMENT', 'PROJECT', 'GAME', 'READING', 'WRITING', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('NOTE', 'EMAIL', 'WHATSAPP', 'MEETING', 'PHONE_CALL', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('DRAFT', 'SENT', 'ANSWERED', 'FOLLOWUP_NEEDED');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'DONE', 'RETURNED');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('CLASS', 'MEETING', 'PARENT_MEETING', 'ASSESSMENT', 'EVENT', 'HOLIDAY', 'DEADLINE', 'PERSONAL', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "schoolName" TEXT,
    "schoolUnit" TEXT,
    "gradeLevel" TEXT,
    "teachingYear" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nickname" TEXT,
    "birthDate" TIMESTAMP(3),
    "photoUrl" TEXT,
    "guardian1Name" TEXT,
    "guardian1Phone" TEXT,
    "guardian1Email" TEXT,
    "guardian2Name" TEXT,
    "guardian2Phone" TEXT,
    "guardian2Email" TEXT,
    "learningStyle" TEXT,
    "strengths" TEXT,
    "challenges" TEXT,
    "specialNeeds" TEXT,
    "medicalNotes" TEXT,
    "enrollmentId" TEXT,
    "classroom" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "category" "ObservationCategory" NOT NULL,
    "sentiment" "ObservationSentiment" NOT NULL DEFAULT 'NEUTRAL',
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "subject" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiSummary" TEXT,
    "aiTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "period" "ReportPeriod" NOT NULL,
    "periodLabel" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "socioEmotional" TEXT,
    "academic" TEXT,
    "language" TEXT,
    "math" TEXT,
    "science" TEXT,
    "socialStudies" TEXT,
    "arts" TEXT,
    "physicalEd" TEXT,
    "participation" TEXT,
    "conclusion" TEXT,
    "sourcedFromObsIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_plans" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "bnccCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "objectives" TEXT NOT NULL,
    "skills" TEXT,
    "content" TEXT,
    "methodology" TEXT,
    "materials" TEXT,
    "activities" TEXT,
    "assessment" TEXT,
    "homework" TEXT,
    "adaptations" TEXT,
    "generatedBy" TEXT,
    "citations" JSONB,
    "status" "LessonPlanStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "lesson_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL DEFAULT 'EXERCISE',
    "subject" TEXT NOT NULL,
    "difficulty" "ActivityDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "instructions" TEXT NOT NULL,
    "items" JSONB,
    "bnccCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedMin" INTEGER,
    "attachmentUrl" TEXT,
    "answerKey" TEXT,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonPlanId" TEXT,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communications" (
    "id" TEXT NOT NULL,
    "type" "CommunicationType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "toName" TEXT,
    "toContact" TEXT,
    "tone" TEXT,
    "generatedBy" TEXT,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "activityType" TEXT,
    "imageUrl" TEXT,
    "pdfUrl" TEXT,
    "rubric" TEXT,
    "grade" TEXT,
    "feedback" TEXT,
    "strengths" TEXT,
    "improvements" TEXT,
    "aiSuggestion" TEXT,
    "generatedBy" TEXT,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CalendarEventType" NOT NULL DEFAULT 'CLASS',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "recurrence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheCreationTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reaction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "students_userId_isActive_idx" ON "students"("userId", "isActive");

-- CreateIndex
CREATE INDEX "students_userId_classroom_idx" ON "students"("userId", "classroom");

-- CreateIndex
CREATE INDEX "observations_userId_occurredAt_idx" ON "observations"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "observations_studentId_occurredAt_idx" ON "observations"("studentId", "occurredAt");

-- CreateIndex
CREATE INDEX "observations_userId_category_idx" ON "observations"("userId", "category");

-- CreateIndex
CREATE INDEX "reports_userId_createdAt_idx" ON "reports"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "reports_studentId_period_idx" ON "reports"("studentId", "period");

-- CreateIndex
CREATE INDEX "lesson_plans_userId_date_idx" ON "lesson_plans"("userId", "date");

-- CreateIndex
CREATE INDEX "lesson_plans_userId_subject_idx" ON "lesson_plans"("userId", "subject");

-- CreateIndex
CREATE INDEX "activities_userId_subject_idx" ON "activities"("userId", "subject");

-- CreateIndex
CREATE INDEX "activities_userId_type_idx" ON "activities"("userId", "type");

-- CreateIndex
CREATE INDEX "communications_userId_createdAt_idx" ON "communications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "communications_studentId_idx" ON "communications"("studentId");

-- CreateIndex
CREATE INDEX "corrections_userId_status_idx" ON "corrections"("userId", "status");

-- CreateIndex
CREATE INDEX "corrections_studentId_idx" ON "corrections"("studentId");

-- CreateIndex
CREATE INDEX "calendar_events_userId_startAt_idx" ON "calendar_events"("userId", "startAt");

-- CreateIndex
CREATE INDEX "calendar_events_userId_type_idx" ON "calendar_events"("userId", "type");

-- CreateIndex
CREATE INDEX "api_usage_userId_createdAt_idx" ON "api_usage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "api_usage_userId_action_idx" ON "api_usage"("userId", "action");

-- CreateIndex
CREATE INDEX "ai_insights_userId_createdAt_idx" ON "ai_insights"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "lesson_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
