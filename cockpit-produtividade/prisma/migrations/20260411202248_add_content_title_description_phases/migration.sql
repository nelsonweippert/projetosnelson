-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentPhase" ADD VALUE 'TITLE';
ALTER TYPE "ContentPhase" ADD VALUE 'DESCRIPTION';

-- AlterTable
ALTER TABLE "contents" ADD COLUMN     "description" TEXT,
ADD COLUMN     "hashtags" TEXT[],
ADD COLUMN     "titleOptions" TEXT[];
