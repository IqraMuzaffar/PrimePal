-- Feature: SNC Pacing Calendar
-- 30-week syllabus structure per classroom with progress tracking

CREATE TABLE IF NOT EXISTS classroom_syllabus (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  week_number  int  NOT NULL CHECK (week_number BETWEEN 1 AND 30),
  topic_title  text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'locked'
               CHECK (status IN ('locked', 'active', 'completed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, week_number)
);

-- RLS: teacher reads/writes only their classrooms' syllabus
ALTER TABLE classroom_syllabus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_owns_syllabus"
  ON classroom_syllabus
  FOR ALL
  USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = auth.uid()
    )
  );

-- Allow service role (backend admin client) full access
CREATE POLICY "service_role_bypass"
  ON classroom_syllabus
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for faster queries by classroom_id + status
CREATE INDEX idx_classroom_syllabus_status
  ON classroom_syllabus(classroom_id, status);
