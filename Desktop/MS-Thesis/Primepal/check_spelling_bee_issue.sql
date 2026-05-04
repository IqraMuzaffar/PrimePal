-- Debug spelling bee loading issue
-- Check if classroom_syllabus table exists and has data

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'classroom_syllabus'
) as table_exists;

-- 2. Check structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'classroom_syllabus'
ORDER BY ordinal_position;

-- 3. Count total rows
SELECT COUNT(*) as total_syllabus_entries FROM classroom_syllabus;

-- 4. Check for active weeks per classroom
SELECT
  classroom_id,
  COUNT(*) as active_weeks,
  MIN(week_number) as min_week,
  MAX(week_number) as max_week
FROM classroom_syllabus
WHERE status = 'active'
GROUP BY classroom_id;

-- 5. Show sample data (first 5 rows)
SELECT * FROM classroom_syllabus LIMIT 5;

-- 6. Check if any classroom has an active week
SELECT classroom_id, topic_title, week_number, status
FROM classroom_syllabus
WHERE status = 'active'
LIMIT 5;
