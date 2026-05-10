-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    description_ur TEXT NOT NULL DEFAULT '',
    icon VARCHAR(10) NOT NULL,
    tier VARCHAR(10) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
    threshold_type VARCHAR(30) NOT NULL CHECK (threshold_type IN ('points', 'missions_reading', 'missions_writing', 'missions_listening', 'missions_speaking', 'streak', 'missions_total')),
    threshold_value INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student achievements junction
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

-- Service role handles all writes. Teachers can read achievements for their students.
CREATE POLICY "Public read achievements" ON achievements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Teachers read student achievements" ON student_achievements FOR SELECT TO authenticated
    USING (student_id IN (SELECT s.id FROM students s JOIN classrooms c ON s.classroom_id = c.id WHERE c.teacher_id = auth.uid()));

-- Seed initial achievements
INSERT INTO achievements (name, description, description_ur, icon, tier, threshold_type, threshold_value) VALUES
    ('First Steps', 'Earn your first 50 points', 'اپنے پہلے 50 پوائنٹس حاصل کریں', '⭐', 'bronze', 'points', 50),
    ('Rising Star', 'Earn 200 points', '200 پوائنٹس حاصل کریں', '🌟', 'silver', 'points', 200),
    ('Champion', 'Earn 500 points', '500 پوائنٹس حاصل کریں', '🏆', 'gold', 'points', 500),
    ('Bookworm', 'Complete 5 reading missions', '5 ریڈنگ مشنز مکمل کریں', '📚', 'bronze', 'missions_reading', 5),
    ('Wordsmith', 'Complete 5 writing missions', '5 رائٹنگ مشنز مکمل کریں', '✏️', 'bronze', 'missions_writing', 5),
    ('Good Listener', 'Complete 5 listening missions', '5 لسننگ مشنز مکمل کریں', '👂', 'bronze', 'missions_listening', 5),
    ('Chatterbox', 'Complete 5 speaking missions', '5 اسپیکنگ مشنز مکمل کریں', '🗣️', 'bronze', 'missions_speaking', 5),
    ('Streak Starter', 'Achieve a 3-day streak', '3 دن کی سلسلہ بندی حاصل کریں', '🔥', 'bronze', 'streak', 3),
    ('On Fire', 'Achieve a 7-day streak', '7 دن کی سلسلہ بندی حاصل کریں', '💥', 'silver', 'streak', 7),
    ('Mission Master', 'Complete 20 missions total', '20 مشنز مکمل کریں', '🎯', 'silver', 'missions_total', 20);
