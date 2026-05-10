-- Check students table schema to see if columns exist
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'students'
ORDER BY ordinal_position;

-- Check if we have any students
SELECT COUNT(*) as student_count FROM students;

-- Sample a few students to see what data exists
SELECT
    id,
    student_name,
    classroom_id,
    points,
    avatar_style,
    theme_color,
    father_name
FROM students
LIMIT 3;
