-- AlterTable
ALTER TABLE "idea_feed" ADD COLUMN     "evidenceId" TEXT,
ADD COLUMN     "evidenceQuote" TEXT;

-- CreateTable
CREATE TABLE "news_evidence" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "summary" TEXT NOT NULL,
    "keyQuote" TEXT,
    "sourceAuthority" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "relevanceScore" INTEGER NOT NULL DEFAULT 50,
    "freshnessHours" INTEGER,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "news_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_evidence_userId_capturedAt_idx" ON "news_evidence"("userId", "capturedAt");

-- CreateIndex
CREATE INDEX "news_evidence_userId_term_capturedAt_idx" ON "news_evidence"("userId", "term", "capturedAt");

-- CreateIndex
CREATE INDEX "news_evidence_userId_processed_idx" ON "news_evidence"("userId", "processed");

-- CreateIndex
CREATE UNIQUE INDEX "news_evidence_userId_url_key" ON "news_evidence"("userId", "url");

-- CreateIndex
CREATE INDEX "idea_feed_evidenceId_idx" ON "idea_feed"("evidenceId");

-- AddForeignKey
ALTER TABLE "idea_feed" ADD CONSTRAINT "idea_feed_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "news_evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_evidence" ADD CONSTRAINT "news_evidence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
