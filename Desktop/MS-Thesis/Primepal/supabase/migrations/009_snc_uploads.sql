-- 009_snc_uploads.sql
-- Upload history: one row per successful PDF embed, scoped to the uploading teacher.
-- Run in Supabase SQL Editor after 008_switch_to_minilm_embeddings.sql

CREATE TABLE IF NOT EXISTS snc_uploads (
    id              UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id      UUID                     NOT NULL,   -- Supabase auth UID
    book_title      TEXT                     NOT NULL,
    grade_level     INT                      NOT NULL CHECK (grade_level BETWEEN 1 AND 6),
    filename        TEXT                     NOT NULL,
    total_chunks    INT                      NOT NULL DEFAULT 0,
    embedded_count  INT                      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_snc_uploads_teacher_grade
    ON snc_uploads (teacher_id, grade_level);

ALTER TABLE snc_uploads ENABLE ROW LEVEL SECURITY;

-- Teachers can only read/insert their own rows
CREATE POLICY "Teacher can insert own uploads"
    ON snc_uploads FOR INSERT
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teacher can read own uploads"
    ON snc_uploads FOR SELECT
    USING (auth.uid() = teacher_id);
