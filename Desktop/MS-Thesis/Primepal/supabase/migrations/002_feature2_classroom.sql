-- supabase/migrations/002_feature2_classroom.sql
-- ============================================================
-- PrimePal Feature 2: Classroom Manager
-- Run AFTER 001_feature1_auth.sql in the Supabase SQL Editor.
-- ============================================================

-- 1. Add grade_level to classrooms (DEFAULT 1 handles any existing rows)
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS grade_level INTEGER NOT NULL DEFAULT 1;

-- 2. Auto-generate a unique 6-character alphanumeric class code
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS trigger AS $$
DECLARE
    new_code VARCHAR(6);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- md5 of a random float → take first 6 chars → uppercase
        new_code := upper(substring(md5(random()::text) from 1 for 6));
        SELECT EXISTS(SELECT 1 FROM classrooms WHERE class_code = new_code) INTO code_exists;
        IF NOT code_exists THEN
            NEW.class_code := new_code;
            EXIT;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger: fires BEFORE INSERT, once per row
DROP TRIGGER IF EXISTS set_class_code ON classrooms;
CREATE TRIGGER set_class_code
    BEFORE INSERT ON classrooms
    FOR EACH ROW
    EXECUTE FUNCTION generate_class_code();
