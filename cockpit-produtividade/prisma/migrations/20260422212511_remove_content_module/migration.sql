-- Drop content module tables and dependent types
DROP TABLE IF EXISTS "content_metrics" CASCADE;
DROP TABLE IF EXISTS "content_areas" CASCADE;
DROP TABLE IF EXISTS "contents" CASCADE;
DROP TABLE IF EXISTS "idea_feed" CASCADE;
DROP TABLE IF EXISTS "news_evidence" CASCADE;
DROP TABLE IF EXISTS "monitor_terms" CASCADE;
DROP TABLE IF EXISTS "skill_sources" CASCADE;

DROP TYPE IF EXISTS "Platform";
DROP TYPE IF EXISTS "ContentFormat";
DROP TYPE IF EXISTS "ContentPhase";
DROP TYPE IF EXISTS "ContentSkill";
