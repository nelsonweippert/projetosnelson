-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentSkill" ADD VALUE 'INSTAGRAM_REELS';
ALTER TYPE "ContentSkill" ADD VALUE 'YOUTUBE_SHORTS';
ALTER TYPE "ContentSkill" ADD VALUE 'YOUTUBE_VIDEO';
ALTER TYPE "ContentSkill" ADD VALUE 'TIKTOK_VIDEO';

