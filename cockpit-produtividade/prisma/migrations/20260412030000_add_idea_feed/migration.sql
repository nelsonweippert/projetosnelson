-- AlterTable
ALTER TABLE "contents" DROP COLUMN "series",
ADD COLUMN     "ideaFeedId" TEXT;

-- CreateTable
CREATE TABLE "monitor_terms" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "monitor_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_feed" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "angle" TEXT,
    "source" TEXT,
    "relevance" TEXT,
    "hook" TEXT,
    "term" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "isDiscarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "idea_feed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monitor_terms_userId_idx" ON "monitor_terms"("userId");

-- CreateIndex
CREATE INDEX "idea_feed_userId_createdAt_idx" ON "idea_feed"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idea_feed_userId_isUsed_isDiscarded_idx" ON "idea_feed"("userId", "isUsed", "isDiscarded");

-- AddForeignKey
ALTER TABLE "monitor_terms" ADD CONSTRAINT "monitor_terms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_feed" ADD CONSTRAINT "idea_feed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

