CREATE OR REPLACE FUNCTION increment_student_points(
  p_student_id uuid,
  p_points int,
  p_missions int DEFAULT 0
)
RETURNS json
LANGUAGE sql
AS $$
  UPDATE students
  SET
    points = points + p_points,
    missions_completed = missions_completed + p_missions
  WHERE id = p_student_id
  RETURNING json_build_object(
    'new_points', points,
    'new_missions', missions_completed
  );
$$;
