-- supabase/migrations/013_add_student_identity_fields.sql
-- ============================================================
-- PrimePal: Add roll_number and email to students table
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE students
ADD COLUMN IF NOT EXISTS roll_number VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN students.roll_number IS 'School roll number / student ID assigned by teacher';
COMMENT ON COLUMN students.email IS 'Optional student email for teacher reference';
