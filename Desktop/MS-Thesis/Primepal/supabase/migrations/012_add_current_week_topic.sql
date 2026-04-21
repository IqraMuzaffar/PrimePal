-- supabase/migrations/012_add_current_week_topic.sql
ALTER TABLE classrooms
ADD COLUMN current_week_topic VARCHAR(500) DEFAULT 'Week 1: Introduction' NOT NULL;

COMMENT ON COLUMN classrooms.current_week_topic IS 'Teacher-set curriculum topic for this week (e.g., "Week 2: Past Tense Nouns"). Used by AI to focus question generation.';
