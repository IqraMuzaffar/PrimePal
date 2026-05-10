-- ============================================================
-- PrimePal: Avatar Customization Columns
-- Run in Supabase SQL Editor
-- ============================================================

-- Add avatar_style and theme_color to students table (idempotent)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS avatar_style TEXT NOT NULL DEFAULT 'adventurer',
  ADD COLUMN IF NOT EXISTS theme_color  TEXT NOT NULL DEFAULT '#6366f1';
