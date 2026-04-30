# T02 — Topic Selection for Task Generation

**Priority:** HIGH
**Status:** TODO
**Depends on:** None (syllabus management is the foundation)

## What Exists

- Syllabus management page: `/teacher/classroom/[id]/syllabus`
- 30-week pacing calendar with active/locked weeks
- `classroom_syllabus` table: `classroom_id, week_number, topic_title, status`
- Active week topic already drives mission generation, speaking prompts, spelling words, story topics
- `snc_topics` table: `id, name, grade_level, description`
- Mission generator uses grade-level RAG context from `snc_knowledge_base`

## What Needs to Be Built

### 1. Grade-Level Topic Selection UI

New page or modal accessible from teacher dashboard:

- Teacher selects a **grade** (e.g., Grade 1)
- System displays **all SNC topics for that grade** from `snc_topics` table
- Topics shown as a **checklist** — all selected by default
- Teacher can deselect topics they don't want assessed
- Save selection → stored in new table `grade_topic_selections`

### 2. Topic Selection Table

```sql
CREATE TABLE grade_topic_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level INTEGER NOT NULL,
  topic_id UUID REFERENCES snc_topics(id),
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

- Global scope (not per-classroom, since there's one shared teacher account)
- Default: all topics active for all grades

### 3. Integration with Mission Generator

- When generating missions for a student, the mission generator must:
  1. Get student's grade level
  2. Query `grade_topic_selections WHERE grade_level = X AND is_active = true`
  3. Use only active topics as RAG filter context
  4. Pass active topic list to the LLM prompt: "Generate questions ONLY from these topics: [list]"

### 4. Integration with Other Features

Topic selection must also filter:
- **Spelling Bee** word pool — only words from active topics
- **Story Time** — stories generated from active topics
- **Speaking prompts** — vocabulary from active topics
- **Chatbot** — guardrail should still answer questions on all curriculum, but proactive suggestions should focus on active topics

### 5. UI Details

- `/teacher/topics` — new page (or integrate into existing `/teacher/curriculum`)
- Grade selector dropdown at top
- Checklist of topics with search/filter
- "Select All" / "Deselect All" buttons
- Visual count: "12 of 15 topics active for Grade 1"
- Save confirmation toast

## Engineering Notes

- This replaces/extends the per-classroom syllabus model for assessment scoping
- The per-classroom syllabus (week-by-week pacing) still exists for scheduling — topic selection is the **assessment filter** layer on top
- If no topics are selected (edge case), default to all topics active

## Files to Touch

- `supabase/migrations/` — `grade_topic_selections` table
- `frontend/src/app/teacher/topics/` — new page (or extend `/teacher/curriculum`)
- `backend/app/endpoints/topics.py` — CRUD for grade topic selections
- `backend/app/agents/mission_generator.py` — filter by active topics
- `backend/app/endpoints/spelling_bee.py` — filter word pool by active topics
- `backend/app/endpoints/story_time.py` — filter by active topics
- `backend/app/endpoints/speaking.py` — filter by active topics
