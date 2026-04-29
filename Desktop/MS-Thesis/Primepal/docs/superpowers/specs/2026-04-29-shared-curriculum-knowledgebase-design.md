# Shared Global Knowledge Base — Curriculum Architecture Refactor

**Date:** 2026-04-29
**Status:** Approved
**Scope:** Database migration, backend API, teacher UI, RAG pipeline

---

## Overview

Replaces the 30-week drag-and-drop pacing calendar with a predefined SNC topic system and a crowdsourced shared vector knowledge base. Any document uploaded by one teacher for a grade becomes available to all teachers of that grade. Teachers activate/deactivate topics per classroom to control what the AI generates questions about.

---

## Section 1: Database

### New Tables

```sql
-- Predefined SNC English topics (global, grade-scoped, admin-editable)
CREATE TABLE snc_topics (
  id SERIAL PRIMARY KEY,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 5),
  topic_name TEXT NOT NULL
);

-- Per-classroom topic activation (stores currently ACTIVE selections)
-- If no rows exist for a classroom → treat ALL grade topics as active (default)
CREATE TABLE classroom_active_topics (
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES snc_topics(id) ON DELETE CASCADE,
  PRIMARY KEY (classroom_id, topic_id)
);
```

### Seed Data

| Grade | Topics |
|-------|--------|
| 1 | Phonics, Colors, Numbers, Animals, Family, Body Parts, Greetings |
| 2 | Nouns, Verbs, Adjectives, Food & Drink, Community, Simple Sentences, Rhyming |
| 3 | Prepositions, Tenses, Reading Comprehension, Vocabulary, Punctuation, Story Sequencing |
| 4 | Grammar, Composition, Idioms, Letter Writing, Synonyms & Antonyms, Paragraphs |
| 5 | Complex Sentences, Literature, Technical Vocabulary, Essay Writing, Figurative Language, Debate |

Topics can be added/edited/deleted at any time via direct SQL — no code change required.

### Default Behavior

When `classroom_active_topics` has no rows for a classroom, the system treats ALL topics for that grade as active. A row is only written when the teacher explicitly saves a selection. This avoids pre-seeding rows at classroom creation time.

### What's Removed

- `classroom_syllabus` table usage in mission generation (table kept in DB but UI entry point removed)
- `classrooms.current_week_topic` usage in mission generation (column kept for backwards compat)

---

## Section 2: Backend API

### New Endpoints

#### `GET /api/v1/topics?grade_level={1-5}`
Returns all `snc_topics` rows for the specified grade.

**Response:**
```json
[
  { "id": 1, "grade_level": 1, "topic_name": "Phonics" },
  { "id": 2, "grade_level": 1, "topic_name": "Colors" }
]
```

#### `GET /api/v1/classroom/{id}/active-topics`
Returns the active topic objects for this classroom.
If no rows in `classroom_active_topics` → returns ALL topics for the classroom's grade (default all active).

**Auth:** Teacher JWT
**Response:**
```json
[
  { "id": 1, "grade_level": 1, "topic_name": "Phonics" },
  { "id": 3, "grade_level": 1, "topic_name": "Numbers" }
]
```

#### `PUT /api/v1/classroom/{id}/active-topics`
Replaces all active topic selections for this classroom (delete-then-insert).

**Auth:** Teacher JWT
**Body:**
```json
{ "topic_ids": [1, 3, 5] }
```
**Response:** `{ "active_count": 3 }`

### Updated Endpoints

#### `GET /api/v1/missions/daily`
1. Resolve `classroom_id` and `grade_level` from JWT
2. Fetch active topic names via `classroom_active_topics` → `snc_topics`
3. If none saved → fetch all topics for grade
4. Build seed phrase: `"English topics: {topic1}, {topic2}, ..."`
5. Retrieve top-5 grade-filtered SNC chunks using topic-aware seed phrase
6. Inject topic list into LLM prompt: *"Generate questions strictly based on these active topics: [list]."*

#### `GET /api/v1/missions/pillar`
Same topic resolution as daily missions. Replaces `classroom_syllabus` week lookup with active topics list. Weakness weighting and affective filter unchanged.

### Cache Key Update
Include a hash of active topic IDs in the cache key to invalidate when topics change:
- Daily: `"daily_missions:{classroom_id}:{is_frustrated}:{topics_hash}"`
- Pillar: `"pillar_missions:{student_id}:{pillar}:{is_frustrated}:{topics_hash}"`

---

## Section 3: Teacher UI

### Curriculum Hub (`app/teacher/curriculum/page.tsx`)

- Keep existing upload flow (PDF → grade_level → chunk → embed → store)
- Add optional `topic_id` dropdown to the upload modal, populated from `snc_topics` for the selected grade
- Store topic tag in chunk metadata: `{ grade_level, topic_id, topic_name, book_title }`
- Documents remain globally shared — any teacher's upload for Grade 2 is available to all Grade 2 classrooms

### Classroom Detail (`app/teacher/classroom/[id]/page.tsx`)

Replace "Curriculum Settings" (free-text `current_week_topic`) with **"Active Topics"** section:

**Layout:** Grid of toggleable pill buttons
- **Filled indigo pill** = active → AI generates questions on this topic
- **Outline gray pill** = inactive → AI skips this topic
- Default: all pills filled (all active) on first visit
- Topics shown match this classroom's `grade_level` only
- "Save Changes" button → `PUT /classroom/{id}/active-topics`
- Optimistic UI: pills toggle instantly, save persists to DB

**Remove:** Link/navigation to `/classroom/[id]/syllabus` page (30-week calendar UI entry point)

---

## Section 4: RAG Pipeline

### Updated Mission Generation Flow

```python
# 1. Fetch active topics for classroom
active_topics = await get_active_topics(classroom_id, grade_level)
# Falls back to all grade topics if none saved
topic_names = [t["topic_name"] for t in active_topics]
topic_list_str = ", ".join(topic_names)

# 2. Topic-aware vector retrieval
seed_phrase = f"English topics: {topic_list_str}"
context_chunks = await retrieve_grade_filtered_chunks(grade_level, seed_phrase)

# 3. LLM prompt injection
"""
Generate questions strictly based on these active topics: {topic_list_str}.
Use the following SNC curriculum context for Grade {grade_level}:
{context}
"""
```

### What's Unchanged
- Grade-level hard filter on vector retrieval (metadata pre-filter in Supabase RPC)
- Affective filter / confidence builder logic
- Weakness-based question weighting (30% weakness focus)
- Embedding model (all-MiniLM-L6-v2, 384-dim)
- Structured output schema for missions

### Future Extension (not in scope)
- Filter vector retrieval by `topic_id` metadata (currently only grade-filtered)
- Admin UI for editing `snc_topics` without SQL

---

## Files Changed

### Backend
- `supabase/migrations/023_snc_topics_and_active_topics.sql` — new tables + seed data
- `backend/app/api/v1/endpoints/topics.py` — new topics endpoint
- `backend/app/api/v1/endpoints/classroom.py` — add active-topics GET/PUT
- `backend/app/api/v1/endpoints/missions.py` — update daily + pillar topic resolution
- `backend/app/agents/tutor_agent/mission_generator.py` — update prompt injection
- `backend/app/main.py` — register topics router

### Frontend
- `frontend/app/teacher/classroom/[id]/page.tsx` — replace curriculum settings with topic pills
- `frontend/app/teacher/curriculum/page.tsx` — add topic_id to upload modal
- `frontend/components/teacher/UploadBookModal.tsx` — topic dropdown
- `frontend/types/index.ts` — add SncTopic type

---

## Non-Goals
- No RBAC or super-admin roles
- No deletion of `classroom_syllabus` table (kept for data safety)
- No per-topic vector filtering (grade-level filter sufficient for now)
- No learning objective mapping
