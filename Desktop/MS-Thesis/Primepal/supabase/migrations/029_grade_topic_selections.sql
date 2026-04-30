-- 029_grade_topic_selections.sql
-- Global grade-level topic selection (controls which topics are assessed)
-- This is a global override layer on top of per-classroom active topics.

CREATE TABLE IF NOT EXISTS grade_topic_selections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grade_level INTEGER NOT NULL,
    topic_id INTEGER NOT NULL REFERENCES snc_topics(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(grade_level, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_grade_topic_sel_grade ON grade_topic_selections(grade_level);

ALTER TABLE grade_topic_selections ENABLE ROW LEVEL SECURITY;

-- Teachers can read and write (shared account model)
CREATE POLICY "Authenticated users manage grade topic selections"
    ON grade_topic_selections FOR ALL TO authenticated USING (true) WITH CHECK (true);
