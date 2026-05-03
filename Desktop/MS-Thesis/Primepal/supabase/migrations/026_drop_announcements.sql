-- Migration: Drop announcements table and related objects
-- This removes the announcements feature completely from the database

-- Drop RLS policies first (if they exist)
DROP POLICY IF EXISTS "Teachers can view all announcements" ON announcements;
DROP POLICY IF EXISTS "Teachers can create announcements for their classrooms" ON announcements;
DROP POLICY IF EXISTS "Teachers can update their own announcements" ON announcements;
DROP POLICY IF EXISTS "Students can view active announcements" ON announcements;
DROP POLICY IF EXISTS "Students can view active announcements for their classroom" ON announcements;
DROP POLICY IF EXISTS "Teachers can view announcements for their scope" ON announcements;
DROP POLICY IF EXISTS "Students can view active scoped announcements" ON announcements;

-- Drop indexes
DROP INDEX IF EXISTS idx_announcements_classroom_active;
DROP INDEX IF EXISTS idx_announcements_teacher;
DROP INDEX IF EXISTS idx_announcements_scope_grade;
DROP INDEX IF EXISTS idx_announcements_active_scope;

-- Drop the announcements table
DROP TABLE IF EXISTS announcements CASCADE;

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Announcements table and all related objects have been dropped';
END $$;
