-- Feature: Surprise Daily Chest (Loot Box) — last_daily_reward_at tracking
-- This column stores the timestamp of the last day a student claimed their daily reward.
-- Used for anti-cheat validation: ensures students can only claim once per day (server-side time check).
-- No new RLS policies needed; existing student policies already cover this column.

ALTER TABLE students ADD COLUMN IF NOT EXISTS last_daily_reward_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Optional: Create an index for efficient timestamp queries
CREATE INDEX IF NOT EXISTS idx_students_last_daily_reward_at ON students(last_daily_reward_at);
