-- Add score column to student_interactions for accurate daily summary tracking
ALTER TABLE student_interactions ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT NULL;

-- Add noise_flagged column for speaking pronunciation noise detection
ALTER TABLE student_interactions ADD COLUMN IF NOT EXISTS noise_flagged BOOLEAN DEFAULT FALSE;

-- Relax the interaction_type CHECK constraint to allow new task types (e.g. mission_speaking, speaking_practice)
ALTER TABLE student_interactions DROP CONSTRAINT IF EXISTS student_interactions_interaction_type_check;
