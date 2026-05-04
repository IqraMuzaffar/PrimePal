-- Set default PIN '1234' for all students
UPDATE students
SET secret_pin = '1234'
WHERE secret_pin IS NULL OR secret_pin = '' OR secret_pin != '1234';

-- Verify the update
SELECT COUNT(*) as total_students,
       COUNT(CASE WHEN secret_pin = '1234' THEN 1 END) as students_with_1234
FROM students;
