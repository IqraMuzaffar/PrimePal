-- Migration 018: Add section column to classrooms
-- Section identifies which section of a grade a classroom belongs to (A, B, C, etc.)
-- class_name becomes an optional custom label; section is the primary identifier.

ALTER TABLE classrooms
  ADD COLUMN IF NOT EXISTS section VARCHAR(10) NOT NULL DEFAULT 'A';

-- Back-fill existing rows: derive section from position within each grade
-- (Simple default: all existing classrooms get 'A' — teacher can update if needed)
-- The DEFAULT 'A' above already handles this.

COMMENT ON COLUMN classrooms.section IS 'Section letter(s) e.g. A, B, C — primary classroom identifier within a grade';
