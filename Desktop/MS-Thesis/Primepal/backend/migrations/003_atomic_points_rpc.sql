CREATE OR REPLACE FUNCTION increment_student_points(
  p_student_id uuid,
  p_points int
)
RETURNS json
LANGUAGE sql
AS $$
  UPDATE students
  SET points = points + p_points
  WHERE id = p_student_id
  RETURNING json_build_object('new_points', points);
$$;
