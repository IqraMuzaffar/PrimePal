# Database Schema Overview

PrimePal uses Supabase (PostgreSQL 15+) with the pgvector extension for curriculum embedding storage. All schema changes are managed via numbered SQL migration files in `supabase/migrations/`.

## Subsections

| File | Description |
|------|-------------|
| [tables.md](tables.md) | Every table with all columns, types, constraints, and defaults (final state after all migrations) |
| [migrations.md](migrations.md) | Index of all 37 migration files with descriptions and tables affected |
| [rls-policies.md](rls-policies.md) | All Row Level Security policies by table |
| [functions.md](functions.md) | SQL functions, RPCs, and triggers |
| [schema-relationships.md](schema-relationships.md) | Foreign key map and entity relationship diagram |
| [edge-functions.md](edge-functions.md) | Supabase Edge Function: auth-hook-add-role |

## Tables by Category

### Authentication & Users
| Table | Purpose |
|-------|---------|
| `teachers` | Teacher/admin accounts (PK is FK to `auth.users.id`) |
| `admin_invite_codes` | One-time invite codes for granting admin role |
| `admin_audit_log` | Audit trail for admin actions |

### Classrooms & Students
| Table | Purpose |
|-------|---------|
| `classrooms` | Class groups owned by teachers, with auto-generated hex codes |
| `students` | Ghost student profiles (not Supabase Auth users), with gamification fields |

### Curriculum & Knowledge Base
| Table | Purpose |
|-------|---------|
| `snc_knowledge_base` | Vector embeddings of SNC English curriculum chunks (pgvector) |
| `snc_uploads` | Upload history for curriculum PDFs with pipeline status tracking |
| `snc_topics` | Predefined SNC English topics organized by grade and LSRW skill |
| `classroom_active_topics` | Per-classroom topic activation (junction table) |
| `grade_topic_selections` | Global grade-level topic activation override |
| `classroom_syllabus` | 30-week syllabus structure per classroom |

### Interactions & Analytics
| Table | Purpose |
|-------|---------|
| `student_interactions` | All student-AI interaction logs (chat, missions, speaking, etc.) |

### Gamification
| Table | Purpose |
|-------|---------|
| `achievements` | Achievement definitions with tiers and thresholds |
| `student_achievements` | Student-achievement junction (unlock tracking) |

### Announcements
| Table | Purpose |
|-------|---------|
| `announcements` | Bilingual teacher announcements with multi-scope support |

### Evaluation (Pre/Post Testing)
| Table | Purpose |
|-------|---------|
| `evaluation_questions` | Fixed question bank per grade for pre/post tests |
| `evaluation_records` | Student responses to evaluation questions |
| `evaluation_status` | Per-student evaluation completion tracking |

## pgvector Setup

The `snc_knowledge_base` table stores curriculum embeddings using pgvector:

- **Extension**: `CREATE EXTENSION IF NOT EXISTS vector;` (migration 004)
- **Column**: `embedding VECTOR(384)` -- MiniLM all-MiniLM-L6-v2 (switched from 1536-dim OpenAI in migration 008)
- **HNSW Index**: `idx_snc_embedding` using `vector_cosine_ops` for fast cosine similarity search
- **GIN Index**: `idx_snc_metadata` on `metadata` JSONB for grade-level pre-filtering before vector math
- **RPC**: `match_snc_documents()` performs grade-filtered cosine similarity search

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `snc-textbooks` | No | Raw SNC PDF textbook uploads (private, teacher-only access) |

## Migration Location

All Supabase migrations: `supabase/migrations/` (001 through 035 + 900_catchup_sync.sql). Note: there are duplicate numbers at 022 and 023. Migration 033 does not exist. Additional RPC/index migrations live in `backend/migrations/` (001-004).
