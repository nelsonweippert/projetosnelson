-- CreateTable
CREATE TABLE "monthly_assessments" (
    "id" TEXT NOT NULL,
    "referenceMonth" TIMESTAMP(3) NOT NULL,
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
    "overallNotes" TEXT,
    "nextSteps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "monthly_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_assessments_userId_referenceMonth_idx" ON "monthly_assessments"("userId", "referenceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_assessments_studentId_referenceMonth_key" ON "monthly_assessments"("studentId", "referenceMonth");

-- AddForeignKey
ALTER TABLE "monthly_assessments" ADD CONSTRAINT "monthly_assessments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_assessments" ADD CONSTRAINT "monthly_assessments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
