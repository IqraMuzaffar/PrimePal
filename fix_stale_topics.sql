-- Fix stale topic references in classroom_active_topics
-- After reorganizing topics by skills, old topic IDs are invalid

-- Option 1: Clear all classroom topic selections (teachers will need to reselect)
DELETE FROM classroom_active_topics;

-- Option 2: Auto-activate all topics for each classroom based on grade
-- This selects all 20 topics (4 skills × 5 topics) for each grade automatically

INSERT INTO classroom_active_topics (classroom_id, topic_id)
SELECT
  c.id as classroom_id,
  t.id as topic_id
FROM classrooms c
CROSS JOIN snc_topics t
WHERE t.grade_level = c.grade_level
ON CONFLICT (classroom_id, topic_id) DO NOTHING;

-- Verify: Show how many topics are active per classroom
SELECT
  c.class_name,
  c.grade_level,
  COUNT(cat.topic_id) as active_topic_count
FROM classrooms c
LEFT JOIN classroom_active_topics cat ON cat.classroom_id = c.id
GROUP BY c.id, c.class_name, c.grade_level
ORDER BY c.grade_level;
