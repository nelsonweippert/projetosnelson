-- AlterTable
ALTER TABLE "monthly_assessments" ADD COLUMN     "generatedBy" TEXT,
ADD COLUMN     "sourcedFromObsIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sourcedFromWeekIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "weekly_assessments" (
    "id" TEXT NOT NULL,
    "referenceWeek" TIMESTAMP(3) NOT NULL,
    "label" TEXT,
    "alimentacao" INTEGER NOT NULL DEFAULT 3,
    "comportamento" INTEGER NOT NULL DEFAULT 3,
    "relacoesInterpessoais" INTEGER NOT NULL DEFAULT 3,
    "participacao" INTEGER NOT NULL DEFAULT 3,
    "autonomia" INTEGER NOT NULL DEFAULT 3,
    "aprendizagem" INTEGER NOT NULL DEFAULT 3,
    "emocional" INTEGER NOT NULL DEFAULT 3,
    "higiene" INTEGER NOT NULL DEFAULT 3,
    "alimentacaoNote" TEXT,
    "comportamentoNote" TEXT,
    "relacoesInterpessoaisNote" TEXT,
    "participacaoNote" TEXT,
    "autonomiaNote" TEXT,
    "aprendizagemNote" TEXT,
    "emocionalNote" TEXT,
    "higieneNote" TEXT,
    "highlight" TEXT,
    "concerns" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "weekly_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weekly_assessments_userId_referenceWeek_idx" ON "weekly_assessments"("userId", "referenceWeek");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_assessments_studentId_referenceWeek_key" ON "weekly_assessments"("studentId", "referenceWeek");

-- AddForeignKey
ALTER TABLE "weekly_assessments" ADD CONSTRAINT "weekly_assessments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_assessments" ADD CONSTRAINT "weekly_assessments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
