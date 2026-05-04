-- ============================================================
-- Remove dummy classroom with class code 1Axx20
-- WARNING: This will CASCADE DELETE all students and related data
-- ============================================================

-- Step 1: Check what will be deleted (run this first to verify)
SELECT
    c.id as classroom_id,
    c.class_name,
    c.class_code,
    c.grade_level,
    COUNT(DISTINCT s.id) as student_count
FROM classrooms c
LEFT JOIN students s ON s.classroom_id = c.id
WHERE UPPER(c.class_code) = '1AXX20'
GROUP BY c.id, c.class_name, c.class_code, c.grade_level;

-- Step 2: View students who will be deleted
SELECT
    s.id,
    s.student_name,
    s.roll_number,
    s.points,
    c.class_code
FROM students s
JOIN classrooms c ON s.classroom_id = c.id
WHERE UPPER(c.class_code) = '1AXX20';

-- Step 3: Delete the classroom (CASCADE will delete students automatically)
-- UNCOMMENT THE LINE BELOW AFTER VERIFYING THE DATA ABOVE
-- DELETE FROM classrooms WHERE UPPER(class_code) = '1AXX20';

-- Step 4: Verify deletion
-- SELECT * FROM classrooms WHERE UPPER(class_code) = '1AXX20';
