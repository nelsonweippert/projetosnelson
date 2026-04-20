-- AlterTable
ALTER TABLE "idea_feed"
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "language" TEXT DEFAULT 'pt-BR',
  ADD COLUMN "pioneerScore" INTEGER;

-- CreateIndex
CREATE INDEX "idea_feed_userId_publishedAt_idx" ON "idea_feed"("userId", "publishedAt");
