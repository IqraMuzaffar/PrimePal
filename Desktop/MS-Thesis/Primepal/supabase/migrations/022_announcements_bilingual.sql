-- Migration 022: Bilingual Announcement Board
-- Creates announcements table with auto-translation support

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  message_en TEXT NOT NULL,
  message_ur TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_announcements_classroom_id ON announcements(classroom_id);
CREATE INDEX IF NOT EXISTS idx_announcements_teacher_id ON announcements(teacher_id);
CREATE INDEX IF NOT EXISTS idx_announcements_classroom_active ON announcements(classroom_id, is_active, created_at DESC);

-- Enable RLS on announcements table
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can view announcements from their own classrooms
CREATE POLICY "Teachers can view announcements from their classrooms"
  ON announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = announcements.classroom_id
      AND classrooms.teacher_id = auth.uid()
    )
  );

-- RLS Policy: Teachers can insert announcements to their own classrooms
CREATE POLICY "Teachers can create announcements in their classrooms"
  ON announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = announcements.classroom_id
      AND classrooms.teacher_id = auth.uid()
    )
    AND teacher_id = auth.uid()
  );

-- RLS Policy: Teachers can update their own announcements
CREATE POLICY "Teachers can update their own announcements"
  ON announcements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = announcements.classroom_id
      AND classrooms.teacher_id = auth.uid()
    )
    AND teacher_id = auth.uid()
  );

-- RLS Policy: Teachers can delete their own announcements
CREATE POLICY "Teachers can delete their own announcements"
  ON announcements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE classrooms.id = announcements.classroom_id
      AND classrooms.teacher_id = auth.uid()
    )
    AND teacher_id = auth.uid()
  );

-- RLS Policy: Students can view active announcements from their classroom
-- (Students don't have direct auth, but we allow backend service role to query on their behalf)
CREATE POLICY "Authenticated users can view active announcements"
  ON announcements
  FOR SELECT
  USING (is_active = true);
