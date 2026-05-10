-- Migration 023: Announcements Multi-Scope Support
-- Adds support for school-wide, grade-level, and classroom-specific announcements

-- Add scope column to announcements table
ALTER TABLE announcements
ADD COLUMN scope VARCHAR(20) DEFAULT 'classroom'
CHECK (scope IN ('classroom', 'grade_level', 'school_wide'));

-- Add optional target_grade_level for grade-scoped announcements
ALTER TABLE announcements
ADD COLUMN target_grade_level INTEGER DEFAULT NULL;

-- Make classroom_id nullable (for school-wide announcements, it can be NULL)
ALTER TABLE announcements
ALTER COLUMN classroom_id DROP NOT NULL;

-- Add indexes for the new scope queries
CREATE INDEX IF NOT EXISTS idx_announcements_scope ON announcements(scope);
CREATE INDEX IF NOT EXISTS idx_announcements_scope_grade ON announcements(scope, target_grade_level, is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_teacher_scope ON announcements(teacher_id, scope, is_active, created_at DESC);

-- Update RLS policies to support new scopes

-- Drop old policies
DROP POLICY IF EXISTS "Teachers can view announcements from their classrooms" ON announcements;
DROP POLICY IF EXISTS "Teachers can create announcements in their classrooms" ON announcements;
DROP POLICY IF EXISTS "Teachers can update their own announcements" ON announcements;
DROP POLICY IF EXISTS "Teachers can delete their own announcements" ON announcements;
DROP POLICY IF EXISTS "Authenticated users can view active announcements" ON announcements;

-- New RLS Policy: Teachers can view their own announcements
CREATE POLICY "Teachers can view their own announcements"
  ON announcements
  FOR SELECT
  USING (teacher_id = auth.uid());

-- New RLS Policy: Teachers can create announcements (validation happens in backend)
CREATE POLICY "Teachers can create announcements"
  ON announcements
  FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- New RLS Policy: Teachers can update their own announcements
CREATE POLICY "Teachers can update their own announcements"
  ON announcements
  FOR UPDATE
  USING (teacher_id = auth.uid());

-- New RLS Policy: Teachers can delete their own announcements
CREATE POLICY "Teachers can delete their own announcements"
  ON announcements
  FOR DELETE
  USING (teacher_id = auth.uid());

-- RLS Policy: Students can view active announcements
-- (Backend handles scope logic - classroom, grade level, or school-wide)
CREATE POLICY "Authenticated users can view active announcements"
  ON announcements
  FOR SELECT
  USING (is_active = true);
