-- Feature: Dynamic Sentiment & Avatar Empathy — Cognitive Load Monitoring
-- Add time_spent column to student_interactions for frustration detection algorithm
-- Also add is_frustrated flag for tracking affective state

ALTER TABLE student_interactions
  ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0
  CHECK (time_spent >= 0 AND time_spent <= 15);

-- Index for efficient rolling-window frustration queries
CREATE INDEX IF NOT EXISTS idx_student_interactions_time_spent
  ON student_interactions(student_id, created_at DESC)
  WHERE interaction_type IN ('mission_mc', 'mission_fill');

-- Optional: Add is_frustrated flag (can be computed on-the-fly, but useful for analytics)
ALTER TABLE student_interactions
  ADD COLUMN IF NOT EXISTS is_frustrated BOOLEAN DEFAULT FALSE;
