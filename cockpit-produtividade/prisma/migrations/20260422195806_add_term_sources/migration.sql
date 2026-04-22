-- AlterTable
ALTER TABLE "monitor_terms" ADD COLUMN     "sources" JSONB,
ADD COLUMN     "sourcesUpdatedAt" TIMESTAMP(3);
