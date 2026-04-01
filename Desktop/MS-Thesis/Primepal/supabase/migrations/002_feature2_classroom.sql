-- supabase/migrations/002_feature2_classroom.sql
-- ============================================================
-- PrimePal Feature 2: Classroom Manager
-- Run AFTER 001_feature1_auth.sql in the Supabase SQL Editor.
-- ============================================================

-- 1. Add grade_level to classrooms (DEFAULT 1 handles any existing rows)
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS grade_level INTEGER NOT NULL DEFAULT 1;

-- 2. Auto-generate a unique 6-character hexadecimal class code (0-9, A-F)
--    SECURITY DEFINER so the collision check queries the full classrooms table,
--    bypassing RLS (which would otherwise limit visibility to the caller's own rows
--    and allow duplicate codes across different teachers).
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_code  VARCHAR(6);
    code_exists BOOLEAN;
    attempts  INTEGER := 0;
BEGIN
    -- If caller explicitly supplied a code, honour it
    IF NEW.class_code IS NOT NULL AND NEW.class_code <> '' THEN
        RETURN NEW;
    END IF;

    LOOP
        attempts := attempts + 1;
        IF attempts > 100 THEN
            RAISE EXCEPTION 'generate_class_code: could not find a unique code after 100 attempts';
        END IF;

        new_code := upper(substring(md5(random()::text) from 1 for 6));
        SELECT EXISTS(SELECT 1 FROM classrooms WHERE class_code = new_code) INTO code_exists;
        IF NOT code_exists THEN
            NEW.class_code := new_code;
            EXIT;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

-- 3. Attach trigger: fires BEFORE INSERT, once per row
DROP TRIGGER IF EXISTS set_class_code ON classrooms;
CREATE TRIGGER set_class_code
    BEFORE INSERT ON classrooms
    FOR EACH ROW
    EXECUTE FUNCTION generate_class_code();
