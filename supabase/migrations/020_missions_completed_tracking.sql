-- Feature: Evolving Worlds (Dynamic Backgrounds) — missions_completed tracking
-- This column tracks the total number of missions successfully completed by each student.
-- Used to unlock different theme tiers: Tier 1 (0-49), Tier 2 (50-99), Tier 3 (100+).
-- No new RLS policies needed; existing student policies already cover this column.

ALTER TABLE students ADD COLUMN IF NOT EXISTS missions_completed INTEGER DEFAULT 0;
