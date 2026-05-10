-- Migration 024: Unique Classroom Section Constraint
-- Ensures each teacher can only have one classroom per grade+section combination
-- Example: Grade 3A can exist only once per teacher, Grade 3B only once, etc.

-- Add unique constraint on (teacher_id, grade_level, class_name)
-- This prevents duplicate sections like two "3A" classes for the same teacher
ALTER TABLE classrooms
ADD CONSTRAINT unique_teacher_grade_section
UNIQUE (teacher_id, grade_level, class_name);

-- Add index for faster lookups when validating duplicates
CREATE INDEX IF NOT EXISTS idx_classrooms_section_check
ON classrooms(teacher_id, grade_level, class_name);
