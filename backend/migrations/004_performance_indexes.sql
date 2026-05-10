CREATE INDEX IF NOT EXISTS idx_interactions_student_pillar_correct
  ON student_interactions(student_id, pillar, correct);

CREATE INDEX IF NOT EXISTS idx_interactions_student_created
  ON student_interactions(student_id, created_at);

CREATE INDEX IF NOT EXISTS idx_students_classroom
  ON students(classroom_id);

CREATE INDEX IF NOT EXISTS idx_classrooms_teacher
  ON classrooms(teacher_id);
