-- AlterTable
ALTER TABLE "idea_feed" ADD COLUMN     "hasInternationalCoverage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publisherHosts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "viralScore" INTEGER;
