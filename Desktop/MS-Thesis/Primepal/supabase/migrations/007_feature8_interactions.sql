-- Feature 8: Student Interaction Log
-- Every chat message and mission answer is recorded here for Agent C (Evaluator).

CREATE TABLE IF NOT EXISTS public.student_interactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL,
    classroom_id    UUID NOT NULL,
    grade_level     INTEGER NOT NULL,
    interaction_type TEXT NOT NULL
                        CHECK (interaction_type IN ('chat', 'mission_mc', 'mission_fill')),
    original_message    TEXT,        -- student's raw input (Roman Urdu / Minglish for chat)
    translated_message  TEXT,        -- English translation (chat only; NULL for missions)
    correct             BOOLEAN,     -- NULL for chat; TRUE/FALSE for missions
    context_used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for per-student queries (Feature 9 report generation)
CREATE INDEX IF NOT EXISTS idx_si_student_id
    ON public.student_interactions (student_id);

-- Index for classroom-level queries (Feature 10 teacher dashboard)
CREATE INDEX IF NOT EXISTS idx_si_classroom_id
    ON public.student_interactions (classroom_id);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_si_created_at
    ON public.student_interactions (created_at DESC);

-- RLS: Enable row-level security (teachers can read their classroom's data)
ALTER TABLE public.student_interactions ENABLE ROW LEVEL SECURITY;

-- Service-role writes bypass RLS (backend uses admin client for inserts)
-- Teachers (authenticated via Supabase GoTrue) can read interactions for their classrooms
CREATE POLICY "Teachers can read their classroom interactions"
    ON public.student_interactions
    FOR SELECT
    TO authenticated
    USING (
        classroom_id IN (
            SELECT id FROM public.classrooms WHERE teacher_id = auth.uid()
        )
    );
