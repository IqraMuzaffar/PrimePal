# A01 — Pre/Post-Test Evaluation System

**Priority:** CRITICAL (thesis data collection depends on this)
**Status:** TODO
**Depends on:** None (co-build with S01 — A01 creates the evaluation schema, S01 builds the student-facing flow on top)

## What Exists

- Student login flow works (class code + avatar + PIN)
- `student_interactions` logs all Q/A data
- Mission engine generates grade-aligned questions from RAG
- No evaluation-specific infrastructure, no isolated data storage, no admin trigger mechanism

## What Needs to Be Built

### 1. Evaluation Questions — Fixed & Standardized

Per grade, two question sets (Pre and Post) must be created:

**Psychometric Baseline (1-3 questions):**
- Simplified Likert-scale questions measuring student confidence and speaking anxiety
- Example: "How do you feel about speaking English?" → Happy Face / Okay Face / Sad Face (3-point scale for young students)
- These measure the **Affective Filter** directly
- Same questions for both Pre and Post test

**Academic Baseline (10 questions):**
- Medium difficulty, grade-aligned
- Distribution: 2-3 questions per skill (LSRW), totaling 10
- Uses same task UI as regular missions (MCQ, fill-blank, listen-select, repeat-sentence)

**Pre vs Post — Same Structure, Different Vocabulary:**
- Keep syntax and task format identical
- Swap target vocabulary from the same SNC curriculum bucket
- Example Pre: "The cat is under the table" (tap correct image) → Post: "The dog is on the chair" (tap correct image)
- Both test the same skill at the same difficulty — rote memorization won't help

### 2. Database Schema

```sql
-- Fixed question bank for evaluations
CREATE TABLE evaluation_questions (
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

-- Student responses to evaluations (ISOLATED from gamification)
CREATE TABLE evaluation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  evaluation_type TEXT NOT NULL CHECK (evaluation_type IN ('pre', 'post')),
  question_id UUID REFERENCES evaluation_questions(id),
  student_answer TEXT,
  is_correct BOOLEAN,
  time_taken_ms INTEGER,
  likert_value INTEGER,  -- for psychometric questions
  grade_level INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Track evaluation status per student
CREATE TABLE evaluation_status (
  student_id UUID PRIMARY KEY REFERENCES students(id),
  pre_test_completed BOOLEAN DEFAULT false,
  pre_test_completed_at TIMESTAMPTZ,
  post_test_completed BOOLEAN DEFAULT false,
  post_test_completed_at TIMESTAMPTZ,
  post_test_unlocked BOOLEAN DEFAULT false  -- admin triggers this
);
```

### 3. Trigger Mechanisms

**Pre-Test**: Automatic on first login (see S01 for student-side flow)
- After student successfully authenticates → check `evaluation_status`
- If `pre_test_completed = false` → route to evaluation wizard
- After completion → set `pre_test_completed = true`, redirect to home

**Post-Test**: Admin-triggered
- Admin dashboard button: "Trigger Post-Test" with options:
  - Global (all students)
  - Per-grade
  - Per-classroom
- Sets `post_test_unlocked = true` for targeted students
- Next time those students log in → forced through post-test wizard (same UX as pre-test)
- Admin endpoint: `POST /admin/evaluations/trigger-post-test` with body `{ scope: "global" | "grade" | "classroom", target_id?: string }`

### 4. Wizard-Style UX

- One question per screen (low cognitive load)
- Survey feel, not exam feel
- Psychometric questions first (3), then academic (10)
- No score shown during evaluation
- No timer pressure (or generous 30s timer)
- Progress indicator: "Question 3 of 13"
- Friendly completion screen

### 5. Data Isolation

- Evaluation scores must **NEVER** feed into `students.points`
- Evaluation scores must **NEVER** appear on leaderboard or daily scores
- `evaluation_records` is the single source for thesis comparative analysis
- Pre and post data for the same student can be compared side-by-side

## Engineering Notes

- The evaluation questions should be **seeded via migration or admin upload** — not generated on-the-fly
- Consider a "Generate evaluation questions" admin tool that uses the LLM + RAG to create a draft, which the admin then reviews and approves before locking
- The pre/post comparison is the core thesis metric — data integrity here is non-negotiable
- For psychometric questions, use emoji-based Likert scale (young students can't parse "Strongly Agree")

## Files to Touch

- `supabase/migrations/` — 3 new tables: `evaluation_questions`, `evaluation_records`, `evaluation_status`
- `backend/app/endpoints/` — new `evaluations.py` router (student-facing + admin triggers)
- `frontend/src/app/student/diagnostic/` — evaluation wizard page (shared by S01)
- `frontend/src/app/admin/dashboard/` — post-test trigger UI
- `backend/app/agents/` — optional: evaluation question generation helper
