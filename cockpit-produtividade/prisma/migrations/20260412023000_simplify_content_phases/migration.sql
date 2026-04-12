-- Update existing records to new phase values
UPDATE "contents" SET "phase" = 'IDEA' WHERE "phase" IN ('RESEARCH', 'SCRIPT', 'TITLE', 'THUMBNAIL', 'DESCRIPTION');
UPDATE "contents" SET "phase" = 'IDEA' WHERE "phase" IN ('RECORDING');
UPDATE "contents" SET "phase" = 'REVIEW' WHERE "phase" IN ('EDITING');

-- AlterEnum
BEGIN;
CREATE TYPE "ContentPhase_new" AS ENUM ('IDEATION', 'ELABORATION', 'EDITING_SENT', 'PUBLISHED', 'ARCHIVED');

-- Map old values to new
UPDATE "contents" SET "phase" = 'IDEA' WHERE "phase" NOT IN ('PUBLISHED', 'ARCHIVED', 'SCHEDULED');
UPDATE "contents" SET "phase" = 'PUBLISHED' WHERE "phase" = 'SCHEDULED';

ALTER TABLE "contents" ALTER COLUMN "phase" DROP DEFAULT;

-- Temporarily set to text, remap, then cast
ALTER TABLE "contents" ALTER COLUMN "phase" TYPE TEXT;
UPDATE "contents" SET "phase" = 'IDEATION' WHERE "phase" IN ('IDEA', 'RESEARCH');
UPDATE "contents" SET "phase" = 'ELABORATION' WHERE "phase" IN ('SCRIPT', 'TITLE', 'THUMBNAIL', 'DESCRIPTION', 'RECORDING', 'REVIEW', 'EDITING');
UPDATE "contents" SET "phase" = 'EDITING_SENT' WHERE "phase" = 'EDITING_SENT';

ALTER TABLE "contents" ALTER COLUMN "phase" TYPE "ContentPhase_new" USING ("phase"::"ContentPhase_new");
ALTER TYPE "ContentPhase" RENAME TO "ContentPhase_old";
ALTER TYPE "ContentPhase_new" RENAME TO "ContentPhase";
DROP TYPE "ContentPhase_old";
ALTER TABLE "contents" ALTER COLUMN "phase" SET DEFAULT 'IDEATION';
COMMIT;

-- AlterTable
ALTER TABLE "contents" ADD COLUMN "rawVideoUrl" TEXT;
