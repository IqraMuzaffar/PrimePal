-- A01: Pre/Post-Test Evaluation System — schema tables

-- Evaluation questions: fixed question bank per grade
CREATE TABLE IF NOT EXISTS evaluation_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level INTEGER NOT NULL,
  evaluation_type TEXT NOT NULL CHECK (evaluation_type IN ('pre', 'post')),
  section TEXT NOT NULL CHECK (section IN ('psychometric', 'academic')),
  pillar TEXT CHECK (pillar IN ('reading', 'writing', 'listening', 'speaking')),
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_text_ur TEXT,
  task_type TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  difficulty TEXT DEFAULT 'medium',
  audio_text TEXT,
  image_context TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Student evaluation responses (ISOLATED from gamification)
CREATE TABLE IF NOT EXISTS evaluation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  evaluation_type TEXT NOT NULL CHECK (evaluation_type IN ('pre', 'post')),
  question_id UUID REFERENCES evaluation_questions(id),
  student_answer TEXT,
  is_correct BOOLEAN,
  time_taken_ms INTEGER,
  likert_value INTEGER,
  grade_level INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Track evaluation status per student
CREATE TABLE IF NOT EXISTS evaluation_status (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  pre_test_completed BOOLEAN DEFAULT false,
  pre_test_completed_at TIMESTAMPTZ,
  post_test_completed BOOLEAN DEFAULT false,
  post_test_completed_at TIMESTAMPTZ,
  post_test_unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE evaluation_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to evaluation_questions"
  ON evaluation_questions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to evaluation_records"
  ON evaluation_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to evaluation_status"
  ON evaluation_status FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Students can read their own evaluation_status"
  ON evaluation_status FOR SELECT TO authenticated USING (true);
