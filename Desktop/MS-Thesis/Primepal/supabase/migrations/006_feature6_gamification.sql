-- Feature 6: Gamification — add points column to students table
-- This column tracks cumulative points earned by students completing daily missions.
-- No new RLS policies needed; existing student policies already cover this column.

ALTER TABLE students ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
