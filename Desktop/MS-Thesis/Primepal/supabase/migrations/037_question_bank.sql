-- 037_question_bank.sql
-- Bounded question bank: pre-generated mission questions per (grade, pillar, topic) slot.
-- Ceiling: 30 questions per slot. ~5 grades × 4 pillars × ~5 topics = ~3000 rows max.
-- Populated when teacher updates active topics; deleted when topics change.

CREATE TABLE IF NOT EXISTS question_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grade_level INTEGER NOT NULL,
    pillar TEXT NOT NULL CHECK (pillar IN ('reading', 'writing', 'listening', 'speaking')),
    topic TEXT NOT NULL,
    task_type TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_data JSONB NOT NULL,          -- Full MissionQuestion fields
    classroom_id UUID NOT NULL,
    times_served INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Primary lookup: fast selection of questions for a given slot
CREATE INDEX IF NOT EXISTS idx_qbank_slot
    ON question_bank (grade_level, pillar, topic);

-- Fast deletion/lookup by classroom (topic changes wipe classroom rows)
CREATE INDEX IF NOT EXISTS idx_qbank_classroom
    ON question_bank (classroom_id);

-- Composite unique: prevent exact duplicate questions in same slot.
-- Uses md5 of question_data JSONB to detect content-identical rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_qbank_no_duplicates
    ON question_bank (grade_level, pillar, topic, classroom_id, task_type, md5(question_data::text));

-- Ordering index: times_served ASC for least-served-first queries
CREATE INDEX IF NOT EXISTS idx_qbank_times_served
    ON question_bank (grade_level, pillar, topic, classroom_id, times_served);

-- RLS: service-role only (backend writes/reads via get_supabase_admin)
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

-- No public policies — only service-role key can access this table.
-- This is intentional: question_bank is a backend-internal optimization table.

-- RPC: atomic bulk increment of times_served for selected questions.
-- Accepts an array of UUIDs and increments each row's counter by 1.
CREATE OR REPLACE FUNCTION increment_bank_times_served(p_ids uuid[])
RETURNS void
LANGUAGE sql
AS $$
  UPDATE question_bank
  SET times_served = times_served + 1
  WHERE id = ANY(p_ids);
$$;
