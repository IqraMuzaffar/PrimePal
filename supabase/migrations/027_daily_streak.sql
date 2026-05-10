-- Add streak tracking columns to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_activity_date DATE DEFAULT NULL;

-- Index for streak queries
CREATE INDEX IF NOT EXISTS idx_students_streak ON students(current_streak DESC);
