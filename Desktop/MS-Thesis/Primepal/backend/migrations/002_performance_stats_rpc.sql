CREATE OR REPLACE FUNCTION get_performance_stats(p_student_id uuid, p_days int DEFAULT 14)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    json_object_agg(pillar, json_build_object(
      'total', total,
      'correct', correct,
      'accuracy', CASE WHEN total > 0 THEN ROUND(correct::numeric / total * 100, 1) ELSE 0 END
    )),
    '{}'::json
  )
  FROM (
    SELECT
      pillar,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE correct = true)::int AS correct
    FROM student_interactions
    WHERE student_id = p_student_id
      AND created_at >= NOW() - (p_days || ' days')::interval
    GROUP BY pillar
  ) sub;
$$;
