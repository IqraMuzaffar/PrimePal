# Database Tables -- Final State

All column definitions reflect the final state after all migrations (001-035 + 900_catchup_sync) are applied in order.

---

## `teachers`

Created in 001, modified in 014.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | -- | PK, FK -> `auth.users(id)` |
| `email` | `VARCHAR(255)` | NOT NULL | -- | UNIQUE |
| `full_name` | `VARCHAR(255)` | NOT NULL | -- | |
| `role` | `VARCHAR(20)` | YES | `'teacher'` | CHECK (`role IN ('teacher', 'admin')`) |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | YES | `timezone('utc'::text, now())` | |

**Indexes**: `idx_teachers_role` on `(role)`

**RLS**: Enabled (see rls-policies.md)

---

## `classrooms`

Created in 001, modified in 002, 012, 018, 024.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `teacher_id` | `UUID` | YES | -- | FK -> `teachers(id)` ON DELETE CASCADE |
| `class_name` | `VARCHAR(100)` | NOT NULL | -- | |
| `class_code` | `VARCHAR(10)` | NOT NULL | -- | UNIQUE |
| `grade_level` | `INTEGER` | NOT NULL | `1` | |
| `current_week_topic` | `VARCHAR(500)` | NOT NULL | `'Week 1: Introduction'` | |
| `section` | `VARCHAR(10)` | NOT NULL | `'A'` | |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | YES | `timezone('utc'::text, now())` | |

**Unique Constraints**: `unique_teacher_grade_section` on `(teacher_id, grade_level, class_name)` (migration 024)

**Indexes**:
- `idx_classrooms_section_check` on `(teacher_id, grade_level, class_name)`
- `idx_classrooms_teacher` on `(teacher_id)` (from 900_catchup_sync)

**Trigger**: `set_class_code` BEFORE INSERT -> `generate_class_code()` (auto-generates 6-char hex code if not provided)

**RLS**: Enabled

---

## `students`

Created in 001, modified in 006, 010, 011, 013, 020, 021, 027.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `classroom_id` | `UUID` | YES | -- | FK -> `classrooms(id)` ON DELETE CASCADE |
| `student_name` | `VARCHAR(100)` | NOT NULL | -- | |
| `avatar_url` | `VARCHAR(255)` | NOT NULL | -- | |
| `points` | `INTEGER` | YES | `0` | |
| `avatar_style` | `TEXT` | NOT NULL | `'adventurer'` | |
| `theme_color` | `TEXT` | NOT NULL | `'#6366f1'` | |
| `secret_pin` | `VARCHAR(4)` | NOT NULL | `'1234'` | |
| `roll_number` | `VARCHAR(20)` | YES | `NULL` | |
| `email` | `VARCHAR(255)` | YES | `NULL` | |
| `missions_completed` | `INTEGER` | YES | `0` | |
| `last_daily_reward_at` | `TIMESTAMP WITH TIME ZONE` | YES | `NULL` | |
| `current_streak` | `INTEGER` | YES | `0` | |
| `longest_streak` | `INTEGER` | YES | `0` | |
| `last_activity_date` | `DATE` | YES | `NULL` | |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | YES | `timezone('utc'::text, now())` | |

**Indexes**:
- `idx_students_last_daily_reward_at` on `(last_daily_reward_at)`
- `idx_students_streak` on `(current_streak DESC)`
- `idx_students_classroom` on `(classroom_id)` (from 900_catchup_sync)

**RLS**: Enabled

---

## `student_interactions`

Created in 007, modified in 016, 017, 019, 022 (sentiment), 028.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `student_id` | `UUID` | NOT NULL | -- | |
| `classroom_id` | `UUID` | NOT NULL | -- | |
| `grade_level` | `INTEGER` | NOT NULL | -- | |
| `interaction_type` | `TEXT` | NOT NULL | -- | CHECK constraint removed in 028 (was `IN ('chat', 'mission_mc', 'mission_fill', 'spelling_bee')`) |
| `original_message` | `TEXT` | YES | -- | Student's raw input |
| `translated_message` | `TEXT` | YES | -- | English translation (chat only) |
| `correct` | `BOOLEAN` | YES | -- | NULL for chat; TRUE/FALSE for missions |
| `context_used` | `BOOLEAN` | NOT NULL | `FALSE` | |
| `pillar` | `TEXT` | YES | -- | CHECK (`pillar IN ('reading', 'writing', 'listening', 'speaking')`) |
| `pronunciation_data` | `JSONB` | YES | `NULL` | Array of word-level pronunciation feedback |
| `time_spent` | `INTEGER` | YES | `0` | CHECK (`time_spent >= 0 AND time_spent <= 15`) |
| `is_frustrated` | `BOOLEAN` | YES | `FALSE` | |
| `score` | `INTEGER` | YES | `NULL` | |
| `noise_flagged` | `BOOLEAN` | YES | `FALSE` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |

**Note**: `student_id` and `classroom_id` do not have explicit FK constraints in the CREATE TABLE. They are logical references to `students.id` and `classrooms.id`.

**Indexes**:
- `idx_si_student_id` on `(student_id)`
- `idx_si_classroom_id` on `(classroom_id)`
- `idx_si_created_at` on `(created_at DESC)`
- `idx_student_interactions_pillar_created` on `(student_id, pillar, created_at DESC)` WHERE `pillar IS NOT NULL`
- `idx_pronunciation_data` GIN on `(pronunciation_data)` WHERE `pronunciation_data IS NOT NULL`
- `idx_student_interactions_time_spent` on `(student_id, created_at DESC)` WHERE `interaction_type IN ('mission_mc', 'mission_fill')`
- `idx_interactions_student_pillar_correct` on `(student_id, pillar, correct)` (from 900_catchup_sync)
- `idx_interactions_student_created` on `(student_id, created_at)` (from 900_catchup_sync)

**RLS**: Enabled

---

## `snc_knowledge_base`

Created in 004, modified in 008.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `content` | `TEXT` | NOT NULL | -- | |
| `metadata` | `JSONB` | NOT NULL | -- | |
| `embedding` | `VECTOR(384)` | YES | -- | Originally VECTOR(1536), changed to 384 in migration 008 |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | YES | `timezone('utc'::text, now())` | |

**Indexes**:
- `idx_snc_embedding` HNSW on `(embedding vector_cosine_ops)`
- `idx_snc_metadata` GIN on `(metadata)`

**RLS**: Enabled

---

## `snc_uploads`

Created in 009, modified in 030.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `teacher_id` | `UUID` | NOT NULL | -- | Supabase auth UID (logical FK to teachers) |
| `book_title` | `TEXT` | NOT NULL | -- | |
| `grade_level` | `INT` | NOT NULL | -- | CHECK (`grade_level BETWEEN 1 AND 6`) |
| `filename` | `TEXT` | NOT NULL | -- | |
| `total_chunks` | `INT` | NOT NULL | `0` | |
| `embedded_count` | `INT` | NOT NULL | `0` | |
| `status` | `TEXT` | YES | `'success'` | CHECK (`status IN ('pending', 'extracting', 'chunking', 'embedding', 'success', 'failed')`) |
| `error_message` | `TEXT` | YES | -- | |
| `updated_at` | `TIMESTAMPTZ` | YES | `now()` | |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | YES | `timezone('utc', now())` | |

**Indexes**: `idx_snc_uploads_teacher_grade` on `(teacher_id, grade_level)`

**RLS**: Enabled

---

## `snc_topics`

Created in 023 (snc_topics_and_active_topics), modified in 034, reseeded in 035.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | NOT NULL | auto-increment | PK |
| `grade_level` | `INTEGER` | NOT NULL | -- | CHECK (`grade_level BETWEEN 1 AND 5`) |
| `topic_name` | `TEXT` | NOT NULL | -- | |
| `skill` | `VARCHAR(20)` | NOT NULL | -- | CHECK (`skill IN ('listening', 'speaking', 'reading', 'writing')`) |

**Indexes**:
- `idx_snc_topics_skill` on `(skill)`
- `idx_snc_topics_grade_skill` on `(grade_level, skill)`

**Seed Data**: 100 topics (5 grades x 4 skills x 5 topics each) covering real SNC curriculum topics (migration 035). Topics are organized by LSRW skills: listening, speaking, reading, writing.

**RLS**: Enabled -- `topics_select_all` allows SELECT for everyone.

---

## `classroom_active_topics`

Created in 023 (snc_topics_and_active_topics).

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `classroom_id` | `UUID` | NOT NULL | -- | FK -> `classrooms(id)` ON DELETE CASCADE, part of composite PK |
| `topic_id` | `INTEGER` | NOT NULL | -- | FK -> `snc_topics(id)` ON DELETE CASCADE, part of composite PK |

**Primary Key**: `(classroom_id, topic_id)` (composite)

**RLS**: Enabled

---

## `grade_topic_selections`

Created in 029.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `grade_level` | `INTEGER` | NOT NULL | -- | |
| `topic_id` | `INTEGER` | NOT NULL | -- | FK -> `snc_topics(id)` ON DELETE CASCADE |
| `is_active` | `BOOLEAN` | YES | `true` | |
| `updated_at` | `TIMESTAMPTZ` | YES | `NOW()` | |

**Unique Constraint**: `(grade_level, topic_id)`

**Indexes**: `idx_grade_topic_sel_grade` on `(grade_level)`

**RLS**: Enabled

---

## `classroom_syllabus`

Created in 015.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `classroom_id` | `UUID` | NOT NULL | -- | FK -> `classrooms(id)` ON DELETE CASCADE |
| `week_number` | `INT` | NOT NULL | -- | CHECK (`week_number BETWEEN 1 AND 30`) |
| `topic_title` | `TEXT` | NOT NULL | `''` | |
| `status` | `TEXT` | NOT NULL | `'locked'` | CHECK (`status IN ('locked', 'active', 'completed')`) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | |

**Unique Constraint**: `(classroom_id, week_number)`

**Indexes**: `idx_classroom_syllabus_status` on `(classroom_id, status)`

**RLS**: Enabled

---

## `announcements`

Created in 022 (announcements_bilingual), modified in 023 (announcements_scope_levels).

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `classroom_id` | `UUID` | YES | -- | FK -> `classrooms(id)` ON DELETE CASCADE (nullable for school-wide announcements) |
| `teacher_id` | `UUID` | NOT NULL | -- | FK -> `teachers(id)` ON DELETE CASCADE |
| `message_en` | `TEXT` | NOT NULL | -- | English message |
| `message_ur` | `TEXT` | NOT NULL | -- | Urdu message |
| `is_active` | `BOOLEAN` | YES | `true` | |
| `scope` | `VARCHAR(20)` | YES | `'classroom'` | CHECK (`scope IN ('classroom', 'grade_level', 'school_wide')`) |
| `target_grade_level` | `INTEGER` | YES | `NULL` | For grade-scoped announcements |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | YES | `NOW()` | |

**Indexes**:
- `idx_announcements_classroom_id` on `(classroom_id)`
- `idx_announcements_teacher_id` on `(teacher_id)`
- `idx_announcements_classroom_active` on `(classroom_id, is_active, created_at DESC)`
- `idx_announcements_scope` on `(scope)`
- `idx_announcements_scope_grade` on `(scope, target_grade_level, is_active)`
- `idx_announcements_teacher_scope` on `(teacher_id, scope, is_active, created_at DESC)`

**RLS**: Enabled

---

## `achievements`

Created in 026.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `name` | `VARCHAR(100)` | NOT NULL | -- | |
| `description` | `TEXT` | NOT NULL | -- | |
| `description_ur` | `TEXT` | NOT NULL | `''` | Urdu description |
| `icon` | `VARCHAR(10)` | NOT NULL | -- | Emoji icon |
| `tier` | `VARCHAR(10)` | NOT NULL | -- | CHECK (`tier IN ('bronze', 'silver', 'gold')`) |
| `threshold_type` | `VARCHAR(30)` | NOT NULL | -- | CHECK (`threshold_type IN ('points', 'missions_reading', 'missions_writing', 'missions_listening', 'missions_speaking', 'streak', 'missions_total')`) |
| `threshold_value` | `INTEGER` | NOT NULL | -- | |
| `created_at` | `TIMESTAMPTZ` | YES | `NOW()` | |

**Seed Data**: 10 initial achievements (3 point-based, 4 pillar-based, 2 streak-based, 1 total missions).

**RLS**: Enabled

---

## `student_achievements`

Created in 026.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `student_id` | `UUID` | NOT NULL | -- | FK -> `students(id)` ON DELETE CASCADE |
| `achievement_id` | `UUID` | NOT NULL | -- | FK -> `achievements(id)` ON DELETE CASCADE |
| `unlocked_at` | `TIMESTAMPTZ` | YES | `NOW()` | |

**Unique Constraint**: `(student_id, achievement_id)`

**Indexes**: `idx_student_achievements_student` on `(student_id)`

**RLS**: Enabled

---

## `admin_invite_codes`

Created in 014.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `code` | `VARCHAR(32)` | NOT NULL | -- | UNIQUE |
| `email` | `VARCHAR(255)` | NOT NULL | -- | |
| `created_by` | `UUID` | YES | -- | FK -> `teachers(id)` ON DELETE SET NULL |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | YES | `timezone('utc'::text, now())` | |
| `used_at` | `TIMESTAMP WITH TIME ZONE` | YES | -- | |
| `expires_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL | -- | |

**Indexes**:
- `idx_admin_invite_codes_code` on `(code)`
- `idx_admin_invite_codes_expires_at` on `(expires_at)`

**RLS**: Enabled

---

## `admin_audit_log`

Created in 014.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `admin_id` | `UUID` | YES | -- | FK -> `teachers(id)` ON DELETE SET NULL |
| `action` | `VARCHAR(50)` | NOT NULL | -- | |
| `resource_type` | `VARCHAR(50)` | NOT NULL | -- | |
| `resource_id` | `VARCHAR(255)` | YES | -- | |
| `details` | `JSONB` | YES | -- | |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | YES | `timezone('utc'::text, now())` | |

**RLS**: Enabled

---

## `evaluation_questions`

Created in 031.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `grade_level` | `INTEGER` | NOT NULL | -- | |
| `evaluation_type` | `TEXT` | NOT NULL | -- | CHECK (`evaluation_type IN ('pre', 'post')`) |
| `section` | `TEXT` | NOT NULL | -- | CHECK (`section IN ('psychometric', 'academic')`) |
| `pillar` | `TEXT` | YES | -- | CHECK (`pillar IN ('reading', 'writing', 'listening', 'speaking')`) |
| `question_index` | `INTEGER` | NOT NULL | -- | |
| `question_text` | `TEXT` | NOT NULL | -- | |
| `question_text_ur` | `TEXT` | YES | -- | Urdu translation |
| `task_type` | `TEXT` | NOT NULL | -- | e.g., `'likert_emoji'`, `'multiple_choice'` |
| `options` | `JSONB` | YES | -- | |
| `correct_answer` | `TEXT` | YES | -- | |
| `difficulty` | `TEXT` | YES | `'medium'` | |
| `audio_text` | `TEXT` | YES | -- | Text to be read aloud for listening/speaking questions |
| `image_context` | `TEXT` | YES | -- | |
| `created_at` | `TIMESTAMPTZ` | YES | `now()` | |

**Seed Data**: Populated by migration 032 / 900_catchup_sync with questions for grades 1-5 (3 psychometric + 10 academic per grade per evaluation type).

**RLS**: Enabled

---

## `evaluation_records`

Created in 031.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `student_id` | `UUID` | YES | -- | FK -> `students(id)` ON DELETE CASCADE |
| `evaluation_type` | `TEXT` | NOT NULL | -- | CHECK (`evaluation_type IN ('pre', 'post')`) |
| `question_id` | `UUID` | YES | -- | FK -> `evaluation_questions(id)` |
| `student_answer` | `TEXT` | YES | -- | |
| `is_correct` | `BOOLEAN` | YES | -- | |
| `time_taken_ms` | `INTEGER` | YES | -- | |
| `likert_value` | `INTEGER` | YES | -- | For psychometric questions |
| `grade_level` | `INTEGER` | NOT NULL | -- | |
| `created_at` | `TIMESTAMPTZ` | YES | `now()` | |

**RLS**: Enabled

---

## `evaluation_status`

Created in 031.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `student_id` | `UUID` | NOT NULL | -- | PK, FK -> `students(id)` ON DELETE CASCADE |
| `pre_test_completed` | `BOOLEAN` | YES | `false` | |
| `pre_test_completed_at` | `TIMESTAMPTZ` | YES | -- | |
| `post_test_completed` | `BOOLEAN` | YES | `false` | |
| `post_test_completed_at` | `TIMESTAMPTZ` | YES | -- | |
| `post_test_unlocked` | `BOOLEAN` | YES | `false` | |
| `created_at` | `TIMESTAMPTZ` | YES | `now()` | |

**RLS**: Enabled
