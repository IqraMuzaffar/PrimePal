-- =============================================================================
-- 900_catchup_sync.sql — One-shot idempotent migration to sync DB with codebase
-- Safe to re-run. Covers migrations: 014, 021, 026, 028, 030, 031, 032, backend/004
-- =============================================================================

-- ─── 1. TEACHERS: add role column (from 014_admin_roles) ────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teachers' AND column_name = 'role'
  ) THEN
    ALTER TABLE teachers ADD COLUMN role VARCHAR(20) DEFAULT 'teacher'
      CHECK (role IN ('teacher', 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teachers_role ON teachers(role);


-- ─── 2. ADMIN INVITE CODES table (from 014) ────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_invite_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_invite_codes_code ON admin_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_admin_invite_codes_expires_at ON admin_invite_codes(expires_at);

ALTER TABLE admin_invite_codes ENABLE ROW LEVEL SECURITY;


-- ─── 3. ADMIN AUDIT LOG table (from 014) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;


-- ─── 4. ADMIN RLS POLICIES (from 014) ──────────────────────────────────────
-- Note: backend uses service_role key which bypasses RLS, so these mainly
-- protect direct Supabase client access from the frontend.

-- invite codes policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view invite codes' AND tablename = 'admin_invite_codes') THEN
    CREATE POLICY "Admins can view invite codes" ON admin_invite_codes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can create invite codes' AND tablename = 'admin_invite_codes') THEN
    CREATE POLICY "Admins can create invite codes" ON admin_invite_codes FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- audit log policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view audit logs' AND tablename = 'admin_audit_log') THEN
    CREATE POLICY "Admins can view audit logs" ON admin_audit_log FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert audit logs' AND tablename = 'admin_audit_log') THEN
    CREATE POLICY "System can insert audit logs" ON admin_audit_log FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Service role full access policies for admin tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access admin_invite_codes' AND tablename = 'admin_invite_codes') THEN
    CREATE POLICY "Service role full access admin_invite_codes" ON admin_invite_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access admin_audit_log' AND tablename = 'admin_audit_log') THEN
    CREATE POLICY "Service role full access admin_audit_log" ON admin_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Teachers table: admins see all, teachers see self (from 014)
DROP POLICY IF EXISTS "Teachers can manage own profile" ON teachers;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins see all teachers, teachers see self' AND tablename = 'teachers') THEN
    CREATE POLICY "Admins see all teachers, teachers see self"
      ON teachers FOR SELECT
      USING (
        (SELECT role FROM teachers WHERE id = auth.uid()) = 'admin'
        OR auth.uid() = id
      );
  END IF;
END $$;

-- Classrooms table: admins see all, teachers see own (from 014)
DROP POLICY IF EXISTS "Teachers can manage own classrooms" ON classrooms;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins see all classrooms, teachers see own' AND tablename = 'classrooms') THEN
    CREATE POLICY "Admins see all classrooms, teachers see own"
      ON classrooms FOR SELECT
      USING (
        (SELECT role FROM teachers WHERE id = auth.uid()) = 'admin'
        OR auth.uid() = teacher_id
      );
  END IF;
END $$;


-- ─── 5. STUDENTS: add last_daily_reward_at (from 021) ──────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'last_daily_reward_at'
  ) THEN
    ALTER TABLE students ADD COLUMN last_daily_reward_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_last_daily_reward_at ON students(last_daily_reward_at);


-- ─── 6. ACHIEVEMENTS tables (from 026) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    description_ur TEXT NOT NULL DEFAULT '',
    icon VARCHAR(10) NOT NULL,
    tier VARCHAR(10) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
    threshold_type VARCHAR(30) NOT NULL CHECK (threshold_type IN (
      'points', 'missions_reading', 'missions_writing',
      'missions_listening', 'missions_speaking', 'streak', 'missions_total'
    )),
    threshold_value INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student ON student_achievements(student_id);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read achievements' AND tablename = 'achievements') THEN
    CREATE POLICY "Public read achievements" ON achievements FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers read student achievements' AND tablename = 'student_achievements') THEN
    CREATE POLICY "Teachers read student achievements" ON student_achievements FOR SELECT TO authenticated
      USING (student_id IN (SELECT s.id FROM students s JOIN classrooms c ON s.classroom_id = c.id WHERE c.teacher_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access achievements' AND tablename = 'achievements') THEN
    CREATE POLICY "Service role full access achievements" ON achievements FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access student_achievements' AND tablename = 'student_achievements') THEN
    CREATE POLICY "Service role full access student_achievements" ON student_achievements FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed achievements (only if table is empty)
INSERT INTO achievements (name, description, description_ur, icon, tier, threshold_type, threshold_value)
SELECT * FROM (VALUES
    ('First Steps',    'Earn your first 50 points',       'اپنے پہلے 50 پوائنٹس حاصل کریں',     '⭐', 'bronze', 'points',            50),
    ('Rising Star',    'Earn 200 points',                  '200 پوائنٹس حاصل کریں',               '🌟', 'silver', 'points',           200),
    ('Champion',       'Earn 500 points',                  '500 پوائنٹس حاصل کریں',               '🏆', 'gold',   'points',           500),
    ('Bookworm',       'Complete 5 reading missions',      '5 ریڈنگ مشنز مکمل کریں',              '📚', 'bronze', 'missions_reading',   5),
    ('Wordsmith',      'Complete 5 writing missions',      '5 رائٹنگ مشنز مکمل کریں',             '✏️', 'bronze', 'missions_writing',   5),
    ('Good Listener',  'Complete 5 listening missions',    '5 لسننگ مشنز مکمل کریں',              '👂', 'bronze', 'missions_listening',  5),
    ('Chatterbox',     'Complete 5 speaking missions',     '5 اسپیکنگ مشنز مکمل کریں',            '🗣️', 'bronze', 'missions_speaking',   5),
    ('Streak Starter', 'Achieve a 3-day streak',           '3 دن کی سلسلہ بندی حاصل کریں',        '🔥', 'bronze', 'streak',              3),
    ('On Fire',        'Achieve a 7-day streak',           '7 دن کی سلسلہ بندی حاصل کریں',        '💥', 'silver', 'streak',              7),
    ('Mission Master', 'Complete 20 missions total',       '20 مشنز مکمل کریں',                   '🎯', 'silver', 'missions_total',     20)
) AS v(name, description, description_ur, icon, tier, threshold_type, threshold_value)
WHERE NOT EXISTS (SELECT 1 FROM achievements LIMIT 1);


-- ─── 7. STUDENT_INTERACTIONS: add score + noise_flagged (from 028) ──────────

ALTER TABLE student_interactions ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT NULL;
ALTER TABLE student_interactions ADD COLUMN IF NOT EXISTS noise_flagged BOOLEAN DEFAULT FALSE;

-- Relax interaction_type CHECK constraint
ALTER TABLE student_interactions DROP CONSTRAINT IF EXISTS student_interactions_interaction_type_check;


-- ─── 8. SNC_UPLOADS: add status tracking columns (from 030) ────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'snc_uploads' AND column_name = 'status'
  ) THEN
    ALTER TABLE snc_uploads ADD COLUMN status TEXT DEFAULT 'success'
      CHECK (status IN ('pending', 'extracting', 'chunking', 'embedding', 'success', 'failed'));
  END IF;
END $$;

ALTER TABLE snc_uploads ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE snc_uploads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();


-- ─── 9. EVALUATION TABLES (from 031) ───────────────────────────────────────

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

CREATE TABLE IF NOT EXISTS evaluation_status (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  pre_test_completed BOOLEAN DEFAULT false,
  pre_test_completed_at TIMESTAMPTZ,
  post_test_completed BOOLEAN DEFAULT false,
  post_test_completed_at TIMESTAMPTZ,
  post_test_unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE evaluation_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_status ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to evaluation_questions' AND tablename = 'evaluation_questions') THEN
    CREATE POLICY "Service role full access to evaluation_questions" ON evaluation_questions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to evaluation_records' AND tablename = 'evaluation_records') THEN
    CREATE POLICY "Service role full access to evaluation_records" ON evaluation_records FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to evaluation_status' AND tablename = 'evaluation_status') THEN
    CREATE POLICY "Service role full access to evaluation_status" ON evaluation_status FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can read their own evaluation_status' AND tablename = 'evaluation_status') THEN
    CREATE POLICY "Students can read their own evaluation_status" ON evaluation_status FOR SELECT TO authenticated USING (true);
  END IF;
END $$;


-- ─── 10. SEED EVALUATION QUESTIONS (from 032) ──────────────────────────────
-- Only insert if table is empty

DO $$
DECLARE
  g INTEGER;
  etype TEXT;
  likert_options JSONB := '[{"label":"Happy","value":3,"emoji":"😊"},{"label":"Okay","value":2,"emoji":"😐"},{"label":"Sad","value":1,"emoji":"😢"}]';
BEGIN
  IF EXISTS (SELECT 1 FROM evaluation_questions LIMIT 1) THEN
    RETURN;
  END IF;

  -- Psychometric questions for all grades
  FOR g IN 1..5 LOOP
    FOREACH etype IN ARRAY ARRAY['pre','post'] LOOP
      INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty)
      VALUES
        (g, etype, 'psychometric', NULL, 1,
         'How do you feel about speaking English?',
         'آپ کو انگریزی بولنے کے بارے میں کیسا لگتا ہے؟',
         'likert_emoji', likert_options, NULL, 'medium'),
        (g, etype, 'psychometric', NULL, 2,
         'How do you feel about reading English?',
         'آپ کو انگریزی پڑھنے کے بارے میں کیسا لگتا ہے؟',
         'likert_emoji', likert_options, NULL, 'medium'),
        (g, etype, 'psychometric', NULL, 3,
         'How confident are you in learning English?',
         'انگریزی سیکھنے میں آپ کو کتنا اعتماد ہے؟',
         'likert_emoji', likert_options, NULL, 'medium');
    END LOOP;
  END LOOP;
END $$;

-- Grade 1 Pre-Test
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
SELECT * FROM (VALUES
(1, 'pre', 'academic', 'reading', 4, 'The cat is on the ___.', 'بلی ___ پر ہے۔', 'multiple_choice', '[{"label":"mat","value":"mat"},{"label":"bat","value":"bat"},{"label":"rat","value":"rat"}]'::jsonb, 'mat', 'easy', NULL::text),
(1, 'pre', 'academic', 'reading', 5, 'What color is an apple?', 'سیب کا رنگ کیا ہے؟', 'multiple_choice', '[{"label":"Blue","value":"blue"},{"label":"Red","value":"red"},{"label":"Green","value":"green"}]'::jsonb, 'red', 'easy', NULL),
(1, 'pre', 'academic', 'reading', 6, 'A dog can ___.', 'کتا ___ سکتا ہے۔', 'multiple_choice', '[{"label":"fly","value":"fly"},{"label":"run","value":"run"},{"label":"swim","value":"swim"}]'::jsonb, 'run', 'easy', NULL),
(1, 'pre', 'academic', 'writing', 7, 'Choose the missing letter: C _ T', 'گم حرف چنیں: C _ T', 'multiple_choice', '[{"label":"A","value":"A"},{"label":"O","value":"O"},{"label":"U","value":"U"}]'::jsonb, 'A', 'easy', NULL),
(1, 'pre', 'academic', 'writing', 8, 'Choose the missing letter: D _ G', 'گم حرف چنیں: D _ G', 'multiple_choice', '[{"label":"O","value":"O"},{"label":"A","value":"A"},{"label":"I","value":"I"}]'::jsonb, 'O', 'easy', NULL),
(1, 'pre', 'academic', 'listening', 9, 'What did you hear?', 'آپ نے کیا سنا؟', 'multiple_choice', '[{"label":"Ball","value":"ball"},{"label":"Doll","value":"doll"},{"label":"Wall","value":"wall"}]'::jsonb, 'ball', 'easy', 'ball'),
(1, 'pre', 'academic', 'listening', 10, 'What did you hear?', 'آپ نے کیا سنا؟', 'multiple_choice', '[{"label":"Cat","value":"cat"},{"label":"Cup","value":"cup"},{"label":"Car","value":"car"}]'::jsonb, 'cat', 'easy', 'cat'),
(1, 'pre', 'academic', 'listening', 11, 'What did you hear?', 'آپ نے کیا سنا؟', 'multiple_choice', '[{"label":"Book","value":"book"},{"label":"Look","value":"look"},{"label":"Cook","value":"cook"}]'::jsonb, 'book', 'easy', 'book'),
(1, 'pre', 'academic', 'speaking', 12, 'Say this word: "Hello"', 'یہ لفظ بولیں: "Hello"', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'easy', 'Hello'),
(1, 'pre', 'academic', 'speaking', 13, 'Say this word: "School"', 'یہ لفظ بولیں: "School"', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'easy', 'School')
) AS v(grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
WHERE NOT EXISTS (SELECT 1 FROM evaluation_questions WHERE grade_level = 1 AND evaluation_type = 'pre' AND section = 'academic' LIMIT 1);

-- Grade 1 Post-Test
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
SELECT * FROM (VALUES
(1, 'post', 'academic', 'reading', 4, 'The bird is in the ___.', 'پرندہ ___ میں ہے۔', 'multiple_choice', '[{"label":"tree","value":"tree"},{"label":"three","value":"three"},{"label":"free","value":"free"}]'::jsonb, 'tree', 'easy', NULL::text),
(1, 'post', 'academic', 'reading', 5, 'What color is the sky?', 'آسمان کا رنگ کیا ہے؟', 'multiple_choice', '[{"label":"Red","value":"red"},{"label":"Blue","value":"blue"},{"label":"Yellow","value":"yellow"}]'::jsonb, 'blue', 'easy', NULL),
(1, 'post', 'academic', 'reading', 6, 'A fish can ___.', 'مچھلی ___ سکتی ہے۔', 'multiple_choice', '[{"label":"fly","value":"fly"},{"label":"run","value":"run"},{"label":"swim","value":"swim"}]'::jsonb, 'swim', 'easy', NULL),
(1, 'post', 'academic', 'writing', 7, 'Choose the missing letter: H _ T', 'گم حرف چنیں: H _ T', 'multiple_choice', '[{"label":"A","value":"A"},{"label":"O","value":"O"},{"label":"I","value":"I"}]'::jsonb, 'A', 'easy', NULL),
(1, 'post', 'academic', 'writing', 8, 'Choose the missing letter: P _ N', 'گم حرف چنیں: P _ N', 'multiple_choice', '[{"label":"E","value":"E"},{"label":"A","value":"A"},{"label":"I","value":"I"}]'::jsonb, 'E', 'easy', NULL),
(1, 'post', 'academic', 'listening', 9, 'What did you hear?', 'آپ نے کیا سنا؟', 'multiple_choice', '[{"label":"Sun","value":"sun"},{"label":"Fun","value":"fun"},{"label":"Run","value":"run"}]'::jsonb, 'sun', 'easy', 'sun'),
(1, 'post', 'academic', 'listening', 10, 'What did you hear?', 'آپ نے کیا سنا؟', 'multiple_choice', '[{"label":"Hen","value":"hen"},{"label":"Pen","value":"pen"},{"label":"Ten","value":"ten"}]'::jsonb, 'hen', 'easy', 'hen'),
(1, 'post', 'academic', 'listening', 11, 'What did you hear?', 'آپ نے کیا سنا؟', 'multiple_choice', '[{"label":"Red","value":"red"},{"label":"Bed","value":"bed"},{"label":"Led","value":"led"}]'::jsonb, 'red', 'easy', 'red'),
(1, 'post', 'academic', 'speaking', 12, 'Say this word: "Thank you"', 'یہ لفظ بولیں: "Thank you"', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'easy', 'Thank you'),
(1, 'post', 'academic', 'speaking', 13, 'Say this word: "Friend"', 'یہ لفظ بولیں: "Friend"', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'easy', 'Friend')
) AS v(grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
WHERE NOT EXISTS (SELECT 1 FROM evaluation_questions WHERE grade_level = 1 AND evaluation_type = 'post' AND section = 'academic' LIMIT 1);

-- Grade 2 Pre-Test
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
SELECT * FROM (VALUES
(2, 'pre', 'academic', 'reading', 4, 'Ali has a pet. It is a ___. It likes milk.', 'علی کے پاس ایک پالتو جانور ہے۔ یہ ___ ہے۔ اسے دودھ پسند ہے۔', 'multiple_choice', '[{"label":"cat","value":"cat"},{"label":"hen","value":"hen"},{"label":"cow","value":"cow"}]'::jsonb, 'cat', 'easy', NULL::text),
(2, 'pre', 'academic', 'reading', 5, 'We go to ___ to study.', 'ہم پڑھنے کے لیے ___ جاتے ہیں۔', 'multiple_choice', '[{"label":"market","value":"market"},{"label":"school","value":"school"},{"label":"park","value":"park"}]'::jsonb, 'school', 'easy', NULL),
(2, 'pre', 'academic', 'reading', 6, 'My mother cooks ___.', 'میری امی ___ پکاتی ہیں۔', 'multiple_choice', '[{"label":"books","value":"books"},{"label":"food","value":"food"},{"label":"toys","value":"toys"}]'::jsonb, 'food', 'easy', NULL),
(2, 'pre', 'academic', 'writing', 7, 'Choose the correct word: I ___ to school every day.', 'صحیح لفظ چنیں: I ___ to school every day.', 'multiple_choice', '[{"label":"go","value":"go"},{"label":"goes","value":"goes"},{"label":"going","value":"going"}]'::jsonb, 'go', 'easy', NULL),
(2, 'pre', 'academic', 'writing', 8, 'Choose the missing word: She ___ a red bag.', 'گم لفظ چنیں: She ___ a red bag.', 'multiple_choice', '[{"label":"has","value":"has"},{"label":"have","value":"have"},{"label":"had","value":"had"}]'::jsonb, 'has', 'easy', NULL),
(2, 'pre', 'academic', 'listening', 9, 'What did you hear?', 'آپ نے کیا سنا؟', 'multiple_choice', '[{"label":"Family","value":"family"},{"label":"Flower","value":"flower"},{"label":"Farmer","value":"farmer"}]'::jsonb, 'family', 'easy', 'family'),
(2, 'pre', 'academic', 'listening', 10, 'What did you hear?', 'آپ نے کیا سنا؟', 'multiple_choice', '[{"label":"Garden","value":"garden"},{"label":"Pardon","value":"pardon"},{"label":"Warden","value":"warden"}]'::jsonb, 'garden', 'easy', 'garden'),
(2, 'pre', 'academic', 'listening', 11, 'What did you hear?', 'آپ نے کیا سنا؟', 'multiple_choice', '[{"label":"Teacher","value":"teacher"},{"label":"Preacher","value":"preacher"},{"label":"Creature","value":"creature"}]'::jsonb, 'teacher', 'easy', 'teacher'),
(2, 'pre', 'academic', 'speaking', 12, 'Say this sentence: "My name is ___."', 'یہ جملہ بولیں: "My name is ___."', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'easy', 'My name is Ali.'),
(2, 'pre', 'academic', 'speaking', 13, 'Say this sentence: "I like to play."', 'یہ جملہ بولیں: "I like to play."', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'easy', 'I like to play.')
) AS v(grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
WHERE NOT EXISTS (SELECT 1 FROM evaluation_questions WHERE grade_level = 2 AND evaluation_type = 'pre' AND section = 'academic' LIMIT 1);

-- Grade 2 Post-Test
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
SELECT * FROM (VALUES
(2, 'post', 'academic', 'reading', 4, 'Sara has a bird. It is ___. It can sing.', 'سارا کے پاس ایک پرندہ ہے۔ یہ ___ ہے۔ یہ گا سکتا ہے۔', 'multiple_choice', '[{"label":"green","value":"green"},{"label":"big","value":"big"},{"label":"small","value":"small"}]'::jsonb, 'small', 'easy', NULL::text),
(2, 'post', 'academic', 'reading', 5, 'We play in the ___.', 'ہم ___ میں کھیلتے ہیں۔', 'multiple_choice', '[{"label":"kitchen","value":"kitchen"},{"label":"park","value":"park"},{"label":"bedroom","value":"bedroom"}]'::jsonb, 'park', 'easy', NULL),
(2, 'post', 'academic', 'reading', 6, 'My father drives a ___.', 'میرے ابو ___ چلاتے ہیں۔', 'multiple_choice', '[{"label":"chair","value":"chair"},{"label":"car","value":"car"},{"label":"kite","value":"kite"}]'::jsonb, 'car', 'easy', NULL),
(2, 'post', 'academic', 'writing', 7, 'Choose the correct word: She ___ to the market.', 'صحیح لفظ چنیں: She ___ to the market.', 'multiple_choice', '[{"label":"go","value":"go"},{"label":"goes","value":"goes"},{"label":"going","value":"going"}]'::jsonb, 'goes', 'easy', NULL),
(2, 'post', 'academic', 'writing', 8, 'Choose the missing word: They ___ two brothers.', 'گم لفظ چنیں: They ___ two brothers.', 'multiple_choice', '[{"label":"has","value":"has"},{"label":"have","value":"have"},{"label":"is","value":"is"}]'::jsonb, 'have', 'easy', NULL),
(2, 'post', 'academic', 'listening', 9, 'What did you hear?', 'آپ نے کیا سنا؟', 'multiple_choice', '[{"label":"Brother","value":"brother"},{"label":"Mother","value":"mother"},{"label":"Other","value":"other"}]'::jsonb, 'brother', 'easy', 'brother'),
(2, 'post', 'academic', 'listening', 10, 'What did you hear?', 'آپ نے کیا سنا؟', 'multiple_choice', '[{"label":"Window","value":"window"},{"label":"Pillow","value":"pillow"},{"label":"Yellow","value":"yellow"}]'::jsonb, 'window', 'easy', 'window'),
(2, 'post', 'academic', 'listening', 11, 'What did you hear?', 'آپ نے کیا سنا؟', 'multiple_choice', '[{"label":"Hospital","value":"hospital"},{"label":"Festival","value":"festival"},{"label":"Animal","value":"animal"}]'::jsonb, 'hospital', 'easy', 'hospital'),
(2, 'post', 'academic', 'speaking', 12, 'Say this sentence: "Good morning, teacher."', 'یہ جملہ بولیں: "Good morning, teacher."', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'easy', 'Good morning, teacher.'),
(2, 'post', 'academic', 'speaking', 13, 'Say this sentence: "I have a red bag."', 'یہ جملہ بولیں: "I have a red bag."', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'easy', 'I have a red bag.')
) AS v(grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
WHERE NOT EXISTS (SELECT 1 FROM evaluation_questions WHERE grade_level = 2 AND evaluation_type = 'post' AND section = 'academic' LIMIT 1);

-- Grade 3 Pre-Test
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
SELECT * FROM (VALUES
(3, 'pre', 'academic', 'reading', 4, 'The farmer grows wheat in the ___.', 'کسان ___ میں گندم اگاتا ہے۔', 'multiple_choice', '[{"label":"field","value":"field"},{"label":"house","value":"house"},{"label":"river","value":"river"}]'::jsonb, 'field', 'medium', NULL::text),
(3, 'pre', 'academic', 'reading', 5, 'Eid is a ___ festival in Pakistan.', 'عید پاکستان میں ایک ___ تہوار ہے۔', 'multiple_choice', '[{"label":"sad","value":"sad"},{"label":"happy","value":"happy"},{"label":"small","value":"small"}]'::jsonb, 'happy', 'medium', NULL),
(3, 'pre', 'academic', 'reading', 6, 'The sun rises in the ___.', 'سورج ___ میں طلوع ہوتا ہے۔', 'multiple_choice', '[{"label":"west","value":"west"},{"label":"east","value":"east"},{"label":"north","value":"north"}]'::jsonb, 'east', 'medium', NULL),
(3, 'pre', 'academic', 'writing', 7, 'Choose the correct sentence:', 'صحیح جملہ چنیں:', 'multiple_choice', '[{"label":"He go to school.","value":"a"},{"label":"He goes to school.","value":"b"},{"label":"He going to school.","value":"c"}]'::jsonb, 'b', 'medium', NULL),
(3, 'pre', 'academic', 'writing', 8, 'Fill in the blank: The children ___ playing cricket.', 'خالی جگہ پر کریں: The children ___ playing cricket.', 'multiple_choice', '[{"label":"is","value":"is"},{"label":"are","value":"are"},{"label":"am","value":"am"}]'::jsonb, 'are', 'medium', NULL),
(3, 'pre', 'academic', 'listening', 9, 'Listen and choose the correct word.', 'سنیں اور صحیح لفظ چنیں۔', 'multiple_choice', '[{"label":"Beautiful","value":"beautiful"},{"label":"Wonderful","value":"wonderful"},{"label":"Powerful","value":"powerful"}]'::jsonb, 'beautiful', 'medium', 'beautiful'),
(3, 'pre', 'academic', 'listening', 10, 'Listen and choose the correct word.', 'سنیں اور صحیح لفظ چنیں۔', 'multiple_choice', '[{"label":"Vegetable","value":"vegetable"},{"label":"Festival","value":"festival"},{"label":"Hospital","value":"hospital"}]'::jsonb, 'vegetable', 'medium', 'vegetable'),
(3, 'pre', 'academic', 'listening', 11, 'Listen and choose the correct word.', 'سنیں اور صحیح لفظ چنیں۔', 'multiple_choice', '[{"label":"Important","value":"important"},{"label":"Elephant","value":"elephant"},{"label":"Different","value":"different"}]'::jsonb, 'important', 'medium', 'important'),
(3, 'pre', 'academic', 'speaking', 12, 'Say this sentence: "Pakistan is my country."', 'یہ جملہ بولیں: "Pakistan is my country."', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'medium', 'Pakistan is my country.'),
(3, 'pre', 'academic', 'speaking', 13, 'Say this sentence: "I like to read books."', 'یہ جملہ بولیں: "I like to read books."', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'medium', 'I like to read books.')
) AS v(grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
WHERE NOT EXISTS (SELECT 1 FROM evaluation_questions WHERE grade_level = 3 AND evaluation_type = 'pre' AND section = 'academic' LIMIT 1);

-- Grade 3 Post-Test
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
SELECT * FROM (VALUES
(3, 'post', 'academic', 'reading', 4, 'The fisherman catches fish in the ___.', 'ماہی گیر ___ میں مچھلی پکڑتا ہے۔', 'multiple_choice', '[{"label":"mountain","value":"mountain"},{"label":"river","value":"river"},{"label":"desert","value":"desert"}]'::jsonb, 'river', 'medium', NULL::text),
(3, 'post', 'academic', 'reading', 5, 'Spring is a ___ season.', 'بہار ایک ___ موسم ہے۔', 'multiple_choice', '[{"label":"cold","value":"cold"},{"label":"pleasant","value":"pleasant"},{"label":"dark","value":"dark"}]'::jsonb, 'pleasant', 'medium', NULL),
(3, 'post', 'academic', 'reading', 6, 'The moon comes out at ___.', 'چاند ___ میں نکلتا ہے۔', 'multiple_choice', '[{"label":"morning","value":"morning"},{"label":"night","value":"night"},{"label":"afternoon","value":"afternoon"}]'::jsonb, 'night', 'medium', NULL),
(3, 'post', 'academic', 'writing', 7, 'Choose the correct sentence:', 'صحیح جملہ چنیں:', 'multiple_choice', '[{"label":"She drink milk.","value":"a"},{"label":"She drinks milk.","value":"b"},{"label":"She drinking milk.","value":"c"}]'::jsonb, 'b', 'medium', NULL),
(3, 'post', 'academic', 'writing', 8, 'Fill in the blank: My sister ___ very kind.', 'خالی جگہ پر کریں: My sister ___ very kind.', 'multiple_choice', '[{"label":"is","value":"is"},{"label":"are","value":"are"},{"label":"am","value":"am"}]'::jsonb, 'is', 'medium', NULL),
(3, 'post', 'academic', 'listening', 9, 'Listen and choose the correct word.', 'سنیں اور صحیح لفظ چنیں۔', 'multiple_choice', '[{"label":"Butterfly","value":"butterfly"},{"label":"Dragonfly","value":"dragonfly"},{"label":"Firefly","value":"firefly"}]'::jsonb, 'butterfly', 'medium', 'butterfly'),
(3, 'post', 'academic', 'listening', 10, 'Listen and choose the correct word.', 'سنیں اور صحیح لفظ چنیں۔', 'multiple_choice', '[{"label":"Mountain","value":"mountain"},{"label":"Fountain","value":"fountain"},{"label":"Captain","value":"captain"}]'::jsonb, 'mountain', 'medium', 'mountain'),
(3, 'post', 'academic', 'listening', 11, 'Listen and choose the correct word.', 'سنیں اور صحیح لفظ چنیں۔', 'multiple_choice', '[{"label":"Tomorrow","value":"tomorrow"},{"label":"Yesterday","value":"yesterday"},{"label":"Together","value":"together"}]'::jsonb, 'tomorrow', 'medium', 'tomorrow'),
(3, 'post', 'academic', 'speaking', 12, 'Say this sentence: "We should help each other."', 'یہ جملہ بولیں: "We should help each other."', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'medium', 'We should help each other.'),
(3, 'post', 'academic', 'speaking', 13, 'Say this sentence: "The weather is very nice today."', 'یہ جملہ بولیں: "The weather is very nice today."', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'medium', 'The weather is very nice today.')
) AS v(grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
WHERE NOT EXISTS (SELECT 1 FROM evaluation_questions WHERE grade_level = 3 AND evaluation_type = 'post' AND section = 'academic' LIMIT 1);

-- Grade 4 Pre-Test
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
SELECT * FROM (VALUES
(4, 'pre', 'academic', 'reading', 4, 'The Indus River flows through ___.', 'دریائے سندھ ___ سے گزرتا ہے۔', 'multiple_choice', '[{"label":"India only","value":"india"},{"label":"Pakistan","value":"pakistan"},{"label":"China only","value":"china"}]'::jsonb, 'pakistan', 'medium', NULL::text),
(4, 'pre', 'academic', 'reading', 5, 'Which word means "happy"?', 'کون سا لفظ "خوش" کا مطلب ہے؟', 'multiple_choice', '[{"label":"Joyful","value":"joyful"},{"label":"Angry","value":"angry"},{"label":"Tired","value":"tired"}]'::jsonb, 'joyful', 'medium', NULL),
(4, 'pre', 'academic', 'reading', 6, 'Choose the correct meaning: "Brave" means ___.', 'صحیح معنی چنیں: "Brave" کا مطلب ___.', 'multiple_choice', '[{"label":"scared","value":"scared"},{"label":"courageous","value":"courageous"},{"label":"lazy","value":"lazy"}]'::jsonb, 'courageous', 'medium', NULL),
(4, 'pre', 'academic', 'writing', 7, 'Choose the correct tense: Yesterday, I ___ to the market.', 'صحیح زمانہ چنیں: Yesterday, I ___ to the market.', 'multiple_choice', '[{"label":"go","value":"go"},{"label":"went","value":"went"},{"label":"will go","value":"will go"}]'::jsonb, 'went', 'medium', NULL),
(4, 'pre', 'academic', 'writing', 8, 'Choose the correct preposition: The book is ___ the table.', 'صحیح حرف جار چنیں: The book is ___ the table.', 'multiple_choice', '[{"label":"on","value":"on"},{"label":"in","value":"in"},{"label":"at","value":"at"}]'::jsonb, 'on', 'medium', NULL),
(4, 'pre', 'academic', 'listening', 9, 'Listen and choose the correct sentence.', 'سنیں اور صحیح جملہ چنیں۔', 'multiple_choice', '[{"label":"The children are playing in the garden.","value":"a"},{"label":"The children is playing in the garden.","value":"b"},{"label":"The children was playing in the garden.","value":"c"}]'::jsonb, 'a', 'medium', 'The children are playing in the garden.'),
(4, 'pre', 'academic', 'listening', 10, 'Listen and choose the correct sentence.', 'سنیں اور صحیح جملہ چنیں۔', 'multiple_choice', '[{"label":"She has completed her homework.","value":"a"},{"label":"She have completed her homework.","value":"b"},{"label":"She completing her homework.","value":"c"}]'::jsonb, 'a', 'medium', 'She has completed her homework.'),
(4, 'pre', 'academic', 'listening', 11, 'Listen and choose the correct sentence.', 'سنیں اور صحیح جملہ چنیں۔', 'multiple_choice', '[{"label":"We will visit Lahore next week.","value":"a"},{"label":"We visiting Lahore next week.","value":"b"},{"label":"We visited Lahore next week.","value":"c"}]'::jsonb, 'a', 'medium', 'We will visit Lahore next week.'),
(4, 'pre', 'academic', 'speaking', 12, 'Read aloud: "Education is very important for everyone."', 'بلند آواز میں پڑھیں: "Education is very important for everyone."', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'medium', 'Education is very important for everyone.'),
(4, 'pre', 'academic', 'speaking', 13, 'Read aloud: "My favourite subject is English."', 'بلند آواز میں پڑھیں: "My favourite subject is English."', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'medium', 'My favourite subject is English.')
) AS v(grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
WHERE NOT EXISTS (SELECT 1 FROM evaluation_questions WHERE grade_level = 4 AND evaluation_type = 'pre' AND section = 'academic' LIMIT 1);

-- Grade 4 Post-Test
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
SELECT * FROM (VALUES
(4, 'post', 'academic', 'reading', 4, 'K2 is the second ___ mountain in the world.', 'K2 دنیا کا دوسرا سب سے ___ پہاڑ ہے۔', 'multiple_choice', '[{"label":"smallest","value":"smallest"},{"label":"tallest","value":"tallest"},{"label":"widest","value":"widest"}]'::jsonb, 'tallest', 'medium', NULL::text),
(4, 'post', 'academic', 'reading', 5, 'Which word is the opposite of "difficult"?', 'کون سا لفظ "مشکل" کی ضد ہے؟', 'multiple_choice', '[{"label":"Hard","value":"hard"},{"label":"Easy","value":"easy"},{"label":"Heavy","value":"heavy"}]'::jsonb, 'easy', 'medium', NULL),
(4, 'post', 'academic', 'reading', 6, 'Choose the correct meaning: "Ancient" means ___.', 'صحیح معنی چنیں: "Ancient" کا مطلب ___.', 'multiple_choice', '[{"label":"new","value":"new"},{"label":"very old","value":"very old"},{"label":"fast","value":"fast"}]'::jsonb, 'very old', 'medium', NULL),
(4, 'post', 'academic', 'writing', 7, 'Choose the correct tense: Tomorrow, she ___ her grandmother.', 'صحیح زمانہ چنیں: Tomorrow, she ___ her grandmother.', 'multiple_choice', '[{"label":"visited","value":"visited"},{"label":"visits","value":"visits"},{"label":"will visit","value":"will visit"}]'::jsonb, 'will visit', 'medium', NULL),
(4, 'post', 'academic', 'writing', 8, 'Choose the correct preposition: The cat is hiding ___ the bed.', 'صحیح حرف جار چنیں: The cat is hiding ___ the bed.', 'multiple_choice', '[{"label":"on","value":"on"},{"label":"under","value":"under"},{"label":"above","value":"above"}]'::jsonb, 'under', 'medium', NULL),
(4, 'post', 'academic', 'listening', 9, 'Listen and choose the correct sentence.', 'سنیں اور صحیح جملہ چنیں۔', 'multiple_choice', '[{"label":"The teacher explained the lesson clearly.","value":"a"},{"label":"The teacher explain the lesson clearly.","value":"b"},{"label":"The teacher explaining the lesson clearly.","value":"c"}]'::jsonb, 'a', 'medium', 'The teacher explained the lesson clearly.'),
(4, 'post', 'academic', 'listening', 10, 'Listen and choose the correct sentence.', 'سنیں اور صحیح جملہ چنیں۔', 'multiple_choice', '[{"label":"They have been waiting for an hour.","value":"a"},{"label":"They has been waiting for an hour.","value":"b"},{"label":"They been waiting for an hour.","value":"c"}]'::jsonb, 'a', 'medium', 'They have been waiting for an hour.'),
(4, 'post', 'academic', 'listening', 11, 'Listen and choose the correct sentence.', 'سنیں اور صحیح جملہ چنیں۔', 'multiple_choice', '[{"label":"Islamabad is the capital of Pakistan.","value":"a"},{"label":"Islamabad are the capital of Pakistan.","value":"b"},{"label":"Islamabad were the capital of Pakistan.","value":"c"}]'::jsonb, 'a', 'medium', 'Islamabad is the capital of Pakistan.'),
(4, 'post', 'academic', 'speaking', 12, 'Read aloud: "We should always respect our elders."', 'بلند آواز میں پڑھیں: "We should always respect our elders."', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'medium', 'We should always respect our elders.'),
(4, 'post', 'academic', 'speaking', 13, 'Read aloud: "The national flower of Pakistan is jasmine."', 'بلند آواز میں پڑھیں: "The national flower of Pakistan is jasmine."', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'medium', 'The national flower of Pakistan is jasmine.')
) AS v(grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
WHERE NOT EXISTS (SELECT 1 FROM evaluation_questions WHERE grade_level = 4 AND evaluation_type = 'post' AND section = 'academic' LIMIT 1);

-- Grade 5 Pre-Test
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
SELECT * FROM (VALUES
(5, 'pre', 'academic', 'reading', 4, 'The passage says: "Quaid-e-Azam believed in unity." What does "unity" mean?', 'عبارت کہتی ہے: "قائداعظم اتحاد پر یقین رکھتے تھے۔" "اتحاد" کا کیا مطلب ہے؟', 'multiple_choice', '[{"label":"Fighting","value":"fighting"},{"label":"Togetherness","value":"togetherness"},{"label":"Sadness","value":"sadness"}]'::jsonb, 'togetherness', 'hard', NULL::text),
(5, 'pre', 'academic', 'reading', 5, 'Which sentence uses the correct punctuation?', 'کون سا جملہ صحیح اوقاف استعمال کرتا ہے؟', 'multiple_choice', '[{"label":"where are you going","value":"a"},{"label":"Where are you going?","value":"b"},{"label":"Where are you going","value":"c"}]'::jsonb, 'b', 'hard', NULL),
(5, 'pre', 'academic', 'reading', 6, 'What is the main idea of: "Trees give us oxygen, shade, and fruit. We must plant more trees."', 'اس عبارت کا بنیادی خیال کیا ہے: "درخت ہمیں آکسیجن، سایہ اور پھل دیتے ہیں۔ ہمیں زیادہ درخت لگانے چاہییں۔"', 'multiple_choice', '[{"label":"Trees are tall.","value":"a"},{"label":"Trees are important and we should plant more.","value":"b"},{"label":"Fruit is delicious.","value":"c"}]'::jsonb, 'b', 'hard', NULL),
(5, 'pre', 'academic', 'writing', 7, 'Choose the correct sentence: If I ___ a bird, I would fly.', 'صحیح جملہ چنیں: If I ___ a bird, I would fly.', 'multiple_choice', '[{"label":"am","value":"am"},{"label":"were","value":"were"},{"label":"was","value":"was"}]'::jsonb, 'were', 'hard', NULL),
(5, 'pre', 'academic', 'writing', 8, 'Choose the correct conjunction: I wanted to go outside, ___ it was raining.', 'صحیح حرف عطف چنیں: I wanted to go outside, ___ it was raining.', 'multiple_choice', '[{"label":"and","value":"and"},{"label":"but","value":"but"},{"label":"or","value":"or"}]'::jsonb, 'but', 'hard', NULL),
(5, 'pre', 'academic', 'listening', 9, 'Listen to the sentence and choose the correct answer: What is the speaker describing?', 'جملہ سنیں اور صحیح جواب چنیں: بولنے والا کیا بیان کر رہا ہے؟', 'multiple_choice', '[{"label":"A library","value":"library"},{"label":"A hospital","value":"hospital"},{"label":"A market","value":"market"}]'::jsonb, 'library', 'hard', 'A place where we can find many books and read quietly is called a library.'),
(5, 'pre', 'academic', 'listening', 10, 'Listen to the sentence and identify the tense.', 'جملہ سنیں اور زمانہ پہچانیں۔', 'multiple_choice', '[{"label":"Past tense","value":"past"},{"label":"Present tense","value":"present"},{"label":"Future tense","value":"future"}]'::jsonb, 'past', 'hard', 'The students completed their project last week.'),
(5, 'pre', 'academic', 'listening', 11, 'Listen and choose what comes next: "First, wash your hands. Then, ___"', 'سنیں اور اگلا قدم چنیں', 'multiple_choice', '[{"label":"go to sleep","value":"sleep"},{"label":"eat your food","value":"eat"},{"label":"play outside","value":"play"}]'::jsonb, 'eat', 'hard', 'First, wash your hands. Then, eat your food.'),
(5, 'pre', 'academic', 'speaking', 12, 'Read this paragraph aloud: "Pakistan has four provinces. Each province has its own culture and language."', 'یہ پیراگراف بلند آواز میں پڑھیں۔', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'hard', 'Pakistan has four provinces. Each province has its own culture and language.'),
(5, 'pre', 'academic', 'speaking', 13, 'Read this paragraph aloud: "We should save water because it is precious. Every drop counts."', 'یہ پیراگراف بلند آواز میں پڑھیں۔', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'hard', 'We should save water because it is precious. Every drop counts.')
) AS v(grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
WHERE NOT EXISTS (SELECT 1 FROM evaluation_questions WHERE grade_level = 5 AND evaluation_type = 'pre' AND section = 'academic' LIMIT 1);

-- Grade 5 Post-Test
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
SELECT * FROM (VALUES
(5, 'post', 'academic', 'reading', 4, 'The passage says: "Allama Iqbal inspired the nation through his poetry." What does "inspired" mean?', 'عبارت کہتی ہے: "علامہ اقبال نے اپنی شاعری سے قوم کو متاثر کیا۔" "متاثر" کا کیا مطلب ہے؟', 'multiple_choice', '[{"label":"Made angry","value":"angry"},{"label":"Motivated","value":"motivated"},{"label":"Confused","value":"confused"}]'::jsonb, 'motivated', 'hard', NULL::text),
(5, 'post', 'academic', 'reading', 5, 'Which sentence uses the correct punctuation?', 'کون سا جملہ صحیح اوقاف استعمال کرتا ہے؟', 'multiple_choice', '[{"label":"what a beautiful day","value":"a"},{"label":"What a beautiful day!","value":"b"},{"label":"What a beautiful day.","value":"c"}]'::jsonb, 'b', 'hard', NULL),
(5, 'post', 'academic', 'reading', 6, 'What is the main idea of: "Clean water is essential for health. Many villages still lack clean drinking water."', 'اس عبارت کا بنیادی خیال کیا ہے؟', 'multiple_choice', '[{"label":"Water is blue.","value":"a"},{"label":"Clean water is a basic need that many lack.","value":"b"},{"label":"Villages are far away.","value":"c"}]'::jsonb, 'b', 'hard', NULL),
(5, 'post', 'academic', 'writing', 7, 'Choose the correct sentence: Neither Ali ___ Ahmed was absent.', 'صحیح جملہ چنیں: Neither Ali ___ Ahmed was absent.', 'multiple_choice', '[{"label":"or","value":"or"},{"label":"nor","value":"nor"},{"label":"and","value":"and"}]'::jsonb, 'nor', 'hard', NULL),
(5, 'post', 'academic', 'writing', 8, 'Choose the correct relative pronoun: The girl ___ won the prize is my friend.', 'صحیح موصول ضمیر چنیں: The girl ___ won the prize is my friend.', 'multiple_choice', '[{"label":"which","value":"which"},{"label":"who","value":"who"},{"label":"whom","value":"whom"}]'::jsonb, 'who', 'hard', NULL),
(5, 'post', 'academic', 'listening', 9, 'Listen to the sentence and choose the correct answer: What is the speaker describing?', 'جملہ سنیں اور صحیح جواب چنیں۔', 'multiple_choice', '[{"label":"A museum","value":"museum"},{"label":"A zoo","value":"zoo"},{"label":"A park","value":"park"}]'::jsonb, 'museum', 'hard', 'A place where we can see old artefacts and learn about history is called a museum.'),
(5, 'post', 'academic', 'listening', 10, 'Listen to the sentence and identify the tense.', 'جملہ سنیں اور زمانہ پہچانیں۔', 'multiple_choice', '[{"label":"Past tense","value":"past"},{"label":"Present tense","value":"present"},{"label":"Future tense","value":"future"}]'::jsonb, 'future', 'hard', 'The school will organize a science fair next month.'),
(5, 'post', 'academic', 'listening', 11, 'Listen and choose what the speaker is asking for.', 'سنیں اور بتائیں بولنے والا کیا مانگ رہا ہے۔', 'multiple_choice', '[{"label":"Directions","value":"directions"},{"label":"Food","value":"food"},{"label":"Permission","value":"permission"}]'::jsonb, 'permission', 'hard', 'May I please go to the library to return my book?'),
(5, 'post', 'academic', 'speaking', 12, 'Read this paragraph aloud: "Helping others is a noble deed. We should always be kind and generous."', 'یہ پیراگراف بلند آواز میں پڑھیں۔', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'hard', 'Helping others is a noble deed. We should always be kind and generous.'),
(5, 'post', 'academic', 'speaking', 13, 'Read this paragraph aloud: "Technology has changed the way we learn. Students can now study online."', 'یہ پیراگراف بلند آواز میں پڑھیں۔', 'multiple_choice', '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]'::jsonb, 'said', 'hard', 'Technology has changed the way we learn. Students can now study online.')
) AS v(grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
WHERE NOT EXISTS (SELECT 1 FROM evaluation_questions WHERE grade_level = 5 AND evaluation_type = 'post' AND section = 'academic' LIMIT 1);


-- ─── 11. PERFORMANCE INDEXES (from backend/004) ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_interactions_student_pillar_correct
  ON student_interactions(student_id, pillar, correct);

CREATE INDEX IF NOT EXISTS idx_interactions_student_created
  ON student_interactions(student_id, created_at);

CREATE INDEX IF NOT EXISTS idx_students_classroom
  ON students(classroom_id);

CREATE INDEX IF NOT EXISTS idx_classrooms_teacher
  ON classrooms(teacher_id);


-- ─── 12. ELEVATE EXISTING TEACHER TO ADMIN ─────────────────────────────────
-- Uncomment ONE of these lines to bootstrap your first admin:

-- UPDATE teachers SET role = 'admin' WHERE email = 'iqramuzaffar2002@gmail.com';
-- UPDATE teachers SET role = 'admin' WHERE email = 'teacher@primepal.test';


-- ═════════════════════════════════════════════════════════════════════════════
-- DONE. Verify with:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'teachers';
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- ═════════════════════════════════════════════════════════════════════════════
