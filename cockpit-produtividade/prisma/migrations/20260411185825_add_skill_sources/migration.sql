-- CreateTable
CREATE TABLE "skill_sources" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "content" TEXT,
    "type" TEXT NOT NULL DEFAULT 'source',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "skill_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skill_sources_userId_skillId_idx" ON "skill_sources"("userId", "skillId");

-- AddForeignKey
ALTER TABLE "skill_sources" ADD CONSTRAINT "skill_sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
