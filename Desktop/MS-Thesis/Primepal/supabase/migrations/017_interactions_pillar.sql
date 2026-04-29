-- Feature: Quests Page — Weekly 4-Pillar Progress Tracking
-- Add pillar column to student_interactions to track per-pillar weekly progress

ALTER TABLE student_interactions
  ADD COLUMN IF NOT EXISTS pillar TEXT
  CHECK (pillar IN ('reading', 'writing', 'listening', 'speaking'));

-- NULL is allowed: chat and spelling_bee interactions have no pillar
-- Create index for faster weekly progress queries
CREATE INDEX IF NOT EXISTS idx_student_interactions_pillar_created
  ON student_interactions(student_id, pillar, created_at DESC)
  WHERE pillar IS NOT NULL;
