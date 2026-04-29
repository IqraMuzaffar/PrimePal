# Database Migrations

All migrations live in `supabase/migrations/`. Applied sequentially.

## Migration Index

| File | Purpose |
|------|---------|
| `001_feature1_auth.sql` | teachers, classrooms, students tables + RLS |
| `002_feature2_classroom.sql` | grade_level column + class_code auto-generation trigger |
| `003_feature3_storage.sql` | snc-textbooks private storage bucket + RLS |
| `004_feature4_pgvector.sql` | pgvector extension, snc_knowledge_base table, HNSW + GIN indexes |
| `005_feature5_chat_rpc.sql` | RPC functions for RAG similarity search |
| `006_feature6_gamification.sql` | Points system, gamification fields |
| `007_feature8_interactions.sql` | student_interactions table |
| `009_snc_uploads.sql` | snc_uploads tracking table |
| `011_secret_pin.sql` | secret_pin column on students |
| `012_add_current_week_topic.sql` | current_week_topic on classrooms |
| `013_add_student_identity_fields.sql` | Additional student fields |
| `015_classroom_syllabus.sql` | Syllabus week configuration |
| `016_spelling_bee_type.sql` | Spelling bee interaction type |
| `017_interactions_pillar.sql` | Pillar column on interactions |
| `018_classroom_section.sql` | Section field on classrooms |
| `019_pronunciation_data.sql` | Pronunciation scoring data |
| `020_missions_completed_tracking.sql` | missions_completed table |
| `021_daily_rewards.sql` | daily_rewards table |
| `022_announcements_bilingual.sql` | Announcements with bilingual support |
| `022_sentiment_affective_filter.sql` | Sentiment analysis fields |
| `024_unique_classroom_section.sql` | Unique constraint on classroom+section |
| `025_student_self_access_policy.sql` | RLS for student self-access |

## Notes
- Migrations are idempotent where possible (uses `IF NOT EXISTS`)
- Applied via Supabase CLI: `supabase db push` or `supabase migration up`
- Two files share the `022_` prefix (announcements + sentiment) — they don't conflict
