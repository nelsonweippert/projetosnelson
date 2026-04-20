-- AlterTable
ALTER TABLE "idea_feed" ADD COLUMN     "supportingEvidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
