-- Migration 019: Add pronunciation_data column for word-level pronunciation feedback
-- Stores granular word-by-word accuracy for speaking practice activities
-- Structure: [{word: "play", status: "correct|incorrect|omitted"}, ...]

ALTER TABLE student_interactions
  ADD COLUMN IF NOT EXISTS pronunciation_data JSONB DEFAULT NULL;

-- Index for querying pronunciation feedback (for reporting/analytics)
CREATE INDEX IF NOT EXISTS idx_pronunciation_data
  ON student_interactions USING GIN(pronunciation_data)
  WHERE pronunciation_data IS NOT NULL;

COMMENT ON COLUMN student_interactions.pronunciation_data IS 'Array of word-level pronunciation feedback. Each object contains {word: string, status: "correct"|"incorrect"|"omitted"}. Populated for speaking_practice and spelling_bee interactions.';
