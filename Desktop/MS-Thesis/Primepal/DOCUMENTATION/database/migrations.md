# Database Migrations

All migrations live in `supabase/migrations/`. They are numbered sequentially and intended to be applied in order. Most are idempotent (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).

## Important Notes

- **Duplicate numbers**: There are two files with prefix `022_` and two with prefix `023_`. They do not conflict with each other (they modify different tables).
- **Missing number**: Migration `033` does not exist (skipped).
- **Catchup migration**: `900_catchup_sync.sql` is an idempotent replay of migrations 014, 021, 026, 028, 030, 031, 032, and some backend indexes. Safe to re-run on databases that may have missed individual migrations.

## Migration Index

| # | Filename | Description | Tables Affected |
|---|----------|-------------|-----------------|
| 001 | `001_feature1_auth.sql` | Creates core tables (`teachers`, `classrooms`, `students`) with RLS. Establishes teacher-classroom-student ownership chain. | `teachers`, `classrooms`, `students` |
| 002 | `002_feature2_classroom.sql` | Adds `grade_level` column to classrooms. Creates `generate_class_code()` trigger function for auto-generating unique 6-char hex class codes. | `classrooms` |
| 003 | `003_feature3_storage.sql` | Creates `snc-textbooks` private storage bucket. Adds storage RLS policies for authenticated teacher upload/read. | `storage.buckets`, `storage.objects` |
| 004 | `004_feature4_pgvector.sql` | Enables pgvector extension. Creates `snc_knowledge_base` table with VECTOR(1536) embedding column, HNSW index, GIN index on metadata JSONB. | `snc_knowledge_base` |
| 005 | `005_feature5_chat_rpc.sql` | Creates `match_snc_documents()` RPC function for grade-filtered cosine similarity search (1536-dim). Grants execute to authenticated. | (function only) |
| 006 | `006_feature6_gamification.sql` | Adds `points INTEGER DEFAULT 0` column to students table. | `students` |
| 007 | `007_feature8_interactions.sql` | Creates `student_interactions` table for logging all student-AI interactions. Adds indexes for student, classroom, and time-series queries. CHECK constraint on `interaction_type`. | `student_interactions` |
| 008 | `008_switch_to_minilm_embeddings.sql` | Switches embedding model from OpenAI (1536-dim) to MiniLM (384-dim). Drops HNSW index, truncates table, alters column to VECTOR(384), recreates index. Replaces `match_snc_documents()` with 384-dim signature. | `snc_knowledge_base` |
| 009 | `009_snc_uploads.sql` | Creates `snc_uploads` table for tracking PDF upload history per teacher. | `snc_uploads` |
| 010 | `010_avatar_customization.sql` | Adds `avatar_style` and `theme_color` columns to students. | `students` |
| 011 | `011_secret_pin.sql` | Adds `secret_pin VARCHAR(4)` column to students for child-safe login. | `students` |
| 012 | `012_add_current_week_topic.sql` | Adds `current_week_topic` column to classrooms for curriculum tracking. | `classrooms` |
| 013 | `013_add_student_identity_fields.sql` | Adds `roll_number` and `email` columns to students. | `students` |
| 014 | `014_admin_roles.sql` | Adds `role` column to teachers. Creates `admin_invite_codes` and `admin_audit_log` tables. Establishes admin RLS policies. Replaces teacher profile/classroom SELECT policies with admin-aware versions. | `teachers`, `admin_invite_codes`, `admin_audit_log`, `classrooms` |
| 015 | `015_classroom_syllabus.sql` | Creates `classroom_syllabus` table for 30-week syllabus structure per classroom. | `classroom_syllabus` |
| 016 | `016_spelling_bee_type.sql` | Updates `interaction_type` CHECK constraint on `student_interactions` to include `'spelling_bee'`. | `student_interactions` |
| 017 | `017_interactions_pillar.sql` | Adds `pillar` column to `student_interactions` with CHECK constraint (reading/writing/listening/speaking). Adds partial index for weekly progress queries. | `student_interactions` |
| 018 | `018_classroom_section.sql` | Adds `section VARCHAR(10)` column to classrooms (default `'A'`). | `classrooms` |
| 019 | `019_pronunciation_data.sql` | Adds `pronunciation_data JSONB` column to `student_interactions` for word-level pronunciation feedback. GIN index on non-null values. | `student_interactions` |
| 020 | `020_missions_completed_tracking.sql` | Adds `missions_completed INTEGER` column to students for tracking total completed missions. Used for dynamic background tier unlocking. | `students` |
| 021 | `021_daily_rewards.sql` | Adds `last_daily_reward_at TIMESTAMPTZ` column to students for daily chest anti-cheat validation. | `students` |
| 022a | `022_announcements_bilingual.sql` | Creates `announcements` table with bilingual support (English + Urdu messages). Adds RLS policies for teacher CRUD and public read of active announcements. | `announcements` |
| 022b | `022_sentiment_affective_filter.sql` | Adds `time_spent INTEGER` (0-15 range) and `is_frustrated BOOLEAN` columns to `student_interactions` for cognitive load monitoring. | `student_interactions` |
| 023a | `023_announcements_scope_levels.sql` | Adds multi-scope support to announcements: `scope` column (classroom/grade_level/school_wide), `target_grade_level` column. Makes `classroom_id` nullable. Replaces all announcement RLS policies with scope-aware versions. | `announcements` |
| 023b | `023_snc_topics_and_active_topics.sql` | Creates `snc_topics` table (predefined SNC English topics by grade) and `classroom_active_topics` junction table. Seeds initial topics for grades 1-5. | `snc_topics`, `classroom_active_topics` |
| 024 | `024_unique_classroom_section.sql` | Adds unique constraint `unique_teacher_grade_section` on `(teacher_id, grade_level, class_name)` to classrooms. | `classrooms` |
| 025 | `025_student_self_access_policy.sql` | Adds RLS policies for students to read and update their own record. | `students` |
| 026 | `026_achievements.sql` | Creates `achievements` and `student_achievements` tables. Seeds 10 initial achievements (point-based, pillar-based, streak-based). | `achievements`, `student_achievements` |
| 027 | `027_daily_streak.sql` | Adds `current_streak`, `longest_streak`, and `last_activity_date` columns to students. | `students` |
| 028 | `028_interactions_score_column.sql` | Adds `score INTEGER` and `noise_flagged BOOLEAN` columns to `student_interactions`. Removes `interaction_type` CHECK constraint to allow new task types. | `student_interactions` |
| 029 | `029_grade_topic_selections.sql` | Creates `grade_topic_selections` table for global grade-level topic activation. | `grade_topic_selections` |
| 030 | `030_snc_uploads_status.sql` | Adds `status`, `error_message`, and `updated_at` columns to `snc_uploads` for pipeline status tracking. | `snc_uploads` |
| 031 | `031_evaluation_tables.sql` | Creates `evaluation_questions`, `evaluation_records`, and `evaluation_status` tables for pre/post-test evaluation system. Isolated from gamification. | `evaluation_questions`, `evaluation_records`, `evaluation_status` |
| 032 | `032_seed_evaluation_questions.sql` | Seeds evaluation questions for grades 1-5: 3 psychometric (likert emoji) + 10 academic (reading/writing/listening/speaking) per grade per evaluation type (pre/post). | `evaluation_questions` |
| -- | *(033 does not exist)* | -- | -- |
| 034 | `034_add_skill_to_topics.sql` | Adds `skill VARCHAR(20)` column to `snc_topics`. Clears and reseeds all topics organized by LSRW skills (20 topics per grade). Sets `skill` to NOT NULL. | `snc_topics` |
| 035 | `035_real_snc_topics_by_skill.sql` | Clears all topic-related data and reseeds `snc_topics` with real SNC curriculum topics organized by LSRW skills (5 per skill per grade = 100 total). Resets sequence. | `snc_topics`, `classroom_active_topics`, `grade_topic_selections` |
| 900 | `900_catchup_sync.sql` | Idempotent catchup migration. Replays: teachers role column (014), admin tables (014), admin RLS (014), last_daily_reward_at (021), achievements tables (026), score/noise_flagged columns (028), snc_uploads status (030), evaluation tables (031), evaluation seeds (032), and performance indexes. | `teachers`, `admin_invite_codes`, `admin_audit_log`, `students`, `achievements`, `student_achievements`, `student_interactions`, `snc_uploads`, `evaluation_questions`, `evaluation_records`, `evaluation_status` |

## Backend RPC/Index Migrations (`backend/migrations/`)

These are supplementary SQL migrations stored in `backend/migrations/` (separate from `supabase/migrations/`). They create RPC functions and performance indexes that complement the Supabase migrations.

| # | Filename | Description | Objects Affected |
|---|----------|-------------|-----------------|
| 001 | `001_achievement_stats_rpc.sql` | Creates `get_student_achievement_stats(uuid)` RPC that returns per-pillar correct counts from `student_interactions`. | Function only |
| 002 | `002_performance_stats_rpc.sql` | Creates `get_performance_stats(uuid, int)` RPC that returns per-pillar accuracy stats for a rolling N-day window (default 14 days). | Function only |
| 003 | `003_atomic_points_rpc.sql` | Creates `increment_student_points(uuid, int)` RPC for atomic point updates (avoids read-modify-write race conditions). | Function only |
| 004 | `004_performance_indexes.sql` | Adds composite indexes for performance queries: `idx_interactions_student_pillar_correct`, `idx_interactions_student_created`, `idx_students_classroom`, `idx_classrooms_teacher`. | Indexes on `student_interactions`, `students`, `classrooms` |

## Applying Migrations

```bash
# Via Supabase CLI
supabase db push
supabase migration up

# Or manually in Supabase SQL Editor (project dashboard)
```
