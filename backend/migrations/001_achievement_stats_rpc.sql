CREATE OR REPLACE FUNCTION get_student_achievement_stats(p_student_id uuid)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'reading_correct', COALESCE(COUNT(*) FILTER (WHERE pillar = 'reading' AND correct = true), 0),
    'writing_correct', COALESCE(COUNT(*) FILTER (WHERE pillar = 'writing' AND correct = true), 0),
    'listening_correct', COALESCE(COUNT(*) FILTER (WHERE pillar = 'listening' AND correct = true), 0),
    'speaking_correct', COALESCE(COUNT(*) FILTER (WHERE pillar = 'speaking' AND correct = true), 0)
  )
  FROM student_interactions
  WHERE student_id = p_student_id;
$$;
