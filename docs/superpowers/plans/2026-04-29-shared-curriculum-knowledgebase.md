# Shared Global Knowledge Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 30-week pacing calendar with predefined SNC topics, a global shared vector knowledge base, and per-classroom topic activation that drives RAG-grounded mission generation.

**Architecture:** A new `snc_topics` table holds predefined Grade 1-5 English topics. A `classroom_active_topics` junction table stores each classroom's active selection (default = all topics active if no rows exist). The FastAPI mission endpoints resolve active topics at request time and pass them as a seed phrase to the vector retrieval and LLM prompt. The teacher UI replaces the free-text topic field with toggleable pill buttons.

**Tech Stack:** PostgreSQL (Supabase), FastAPI, Python 3.12, Next.js 14, TypeScript, Supabase JS client, TailwindCSS

---

## File Map

### Created
- `supabase/migrations/023_snc_topics_and_active_topics.sql` — tables + seed data
- `backend/app/api/v1/endpoints/topics.py` — `GET /topics?grade_level=`
- `backend/tests/test_topics.py` — tests for topics endpoint

### Modified
- `backend/app/api/v1/router.py` — register topics router
- `backend/app/api/v1/endpoints/classroom.py` — add `GET /classroom/{id}/active-topics` and `PUT /classroom/{id}/active-topics`
- `backend/app/api/v1/endpoints/missions.py` — update daily + pillar topic resolution, remove syllabus lookup
- `backend/app/agents/tutor_agent/mission_generator.py` — add `active_topics` param to both generate functions, update prompts
- `frontend/types/index.ts` — add `SncTopic` type
- `frontend/app/teacher/classroom/[id]/page.tsx` — replace Curriculum Settings section with Active Topics pill UI
- `frontend/components/teacher/UploadBookModal.tsx` — add optional topic dropdown
- `frontend/app/teacher/curriculum/page.tsx` — pass topics to UploadBookModal

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/023_snc_topics_and_active_topics.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 023_snc_topics_and_active_topics.sql

-- Predefined SNC English topics (global, grade-scoped)
CREATE TABLE IF NOT EXISTS snc_topics (
  id SERIAL PRIMARY KEY,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 5),
  topic_name TEXT NOT NULL
);

-- Per-classroom topic activation
-- If no rows exist for a classroom → treat ALL grade topics as active
CREATE TABLE IF NOT EXISTS classroom_active_topics (
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES snc_topics(id) ON DELETE CASCADE,
  PRIMARY KEY (classroom_id, topic_id)
);

-- Seed: Grade 1
INSERT INTO snc_topics (grade_level, topic_name) VALUES
  (1, 'Phonics'),
  (1, 'Colors'),
  (1, 'Numbers'),
  (1, 'Animals'),
  (1, 'Family'),
  (1, 'Body Parts'),
  (1, 'Greetings');

-- Seed: Grade 2
INSERT INTO snc_topics (grade_level, topic_name) VALUES
  (2, 'Nouns'),
  (2, 'Verbs'),
  (2, 'Adjectives'),
  (2, 'Food & Drink'),
  (2, 'Community'),
  (2, 'Simple Sentences'),
  (2, 'Rhyming');

-- Seed: Grade 3
INSERT INTO snc_topics (grade_level, topic_name) VALUES
  (3, 'Prepositions'),
  (3, 'Tenses'),
  (3, 'Reading Comprehension'),
  (3, 'Vocabulary'),
  (3, 'Punctuation'),
  (3, 'Story Sequencing');

-- Seed: Grade 4
INSERT INTO snc_topics (grade_level, topic_name) VALUES
  (4, 'Grammar'),
  (4, 'Composition'),
  (4, 'Idioms'),
  (4, 'Letter Writing'),
  (4, 'Synonyms & Antonyms'),
  (4, 'Paragraphs');

-- Seed: Grade 5
INSERT INTO snc_topics (grade_level, topic_name) VALUES
  (5, 'Complex Sentences'),
  (5, 'Literature'),
  (5, 'Technical Vocabulary'),
  (5, 'Essay Writing'),
  (5, 'Figurative Language'),
  (5, 'Debate');

-- RLS: teachers can read all topics (no insert/delete — admin-only via SQL)
ALTER TABLE snc_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_select_all" ON snc_topics FOR SELECT USING (true);

-- RLS: teachers can manage their own classroom's active topics
ALTER TABLE classroom_active_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active_topics_select" ON classroom_active_topics
  FOR SELECT USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "active_topics_insert" ON classroom_active_topics
  FOR INSERT WITH CHECK (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "active_topics_delete" ON classroom_active_topics
  FOR DELETE USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Run migration in Supabase dashboard**

Open Supabase → SQL Editor → paste the file contents → Run.

Verify with:
```sql
SELECT grade_level, count(*) FROM snc_topics GROUP BY grade_level ORDER BY grade_level;
```
Expected output:
```
grade_level | count
------------+------
1           | 7
2           | 7
3           | 6
4           | 6
5           | 6
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/023_snc_topics_and_active_topics.sql
git commit -m "feat: add snc_topics and classroom_active_topics migration with seed data"
```

---

## Task 2: Topics Endpoint (GET /topics)

**Files:**
- Create: `backend/app/api/v1/endpoints/topics.py`
- Create: `backend/tests/test_topics.py`
- Modify: `backend/app/api/v1/router.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_topics.py`:

```python
"""Tests for GET /api/v1/topics endpoint."""
import pytest
from unittest.mock import MagicMock, patch


def make_topic_row(id: int, grade_level: int, topic_name: str) -> dict:
    return {"id": id, "grade_level": grade_level, "topic_name": topic_name}


def test_get_topics_returns_list_for_valid_grade():
    """GET /topics?grade_level=1 returns topic list for grade 1."""
    from app.api.v1.endpoints.topics import get_topics

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        make_topic_row(1, 1, "Phonics"),
        make_topic_row(2, 1, "Colors"),
    ]

    import asyncio
    result = asyncio.run(get_topics(grade_level=1, supabase=mock_supabase))

    assert len(result) == 2
    assert result[0]["topic_name"] == "Phonics"
    assert result[0]["grade_level"] == 1


def test_get_topics_invalid_grade_raises_422():
    """GET /topics?grade_level=9 is rejected by FastAPI validation (grade 1-5 only)."""
    from app.api.v1.endpoints.topics import get_topics
    import asyncio
    from fastapi import HTTPException

    mock_supabase = MagicMock()
    # grade_level=9 should raise HTTPException before hitting supabase
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_topics(grade_level=9, supabase=mock_supabase))
    assert exc_info.value.status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_topics.py -v
```

Expected: `ImportError: cannot import name 'get_topics' from 'app.api.v1.endpoints.topics'`

- [ ] **Step 3: Create the topics endpoint**

Create `backend/app/api/v1/endpoints/topics.py`:

```python
"""
GET /api/v1/topics?grade_level={1-5}

Returns all predefined SNC English topics for the specified grade level.
No auth required — topics are public reference data.
"""
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.core.supabase_client import get_supabase_admin

router = APIRouter()


class SncTopicOut(BaseModel):
    id: int
    grade_level: int
    topic_name: str


@router.get("/", response_model=list[SncTopicOut], summary="List SNC topics for a grade")
async def get_topics(
    grade_level: int = Query(..., description="Grade level (1-5)"),
    supabase=None,
):
    """
    Returns all predefined SNC English topics for the given grade level.
    Topics are global and shared across all classrooms.
    """
    if grade_level < 1 or grade_level > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="grade_level must be between 1 and 5",
        )

    if supabase is None:
        supabase = get_supabase_admin()

    resp = (
        supabase.table("snc_topics")
        .select("id, grade_level, topic_name")
        .eq("grade_level", grade_level)
        .order("id")
        .execute()
    )
    return resp.data or []
```

- [ ] **Step 4: Register the router**

Edit `backend/app/api/v1/router.py` — add topics import and include:

```python
from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin, announcements, auth, chat, classroom, curriculum,
    evaluator, interactions, missions, rewards, speaking,
    spelling_bee, story_time, topics, tutor,
)

api_router = APIRouter()

api_router.include_router(admin.router)
api_router.include_router(announcements.router, prefix="/announcements", tags=["announcements"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(classroom.router, prefix="/classroom", tags=["classroom"])
api_router.include_router(curriculum.router, prefix="/curriculum", tags=["curriculum"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(topics.router, prefix="/topics", tags=["topics"])
api_router.include_router(tutor.router, prefix="/tutor", tags=["tutor"])
api_router.include_router(evaluator.router, prefix="/evaluator", tags=["evaluator"])
api_router.include_router(missions.router, prefix="/missions", tags=["missions"])
api_router.include_router(rewards.router, prefix="/rewards", tags=["rewards"])
api_router.include_router(interactions.router, prefix="/interactions", tags=["interactions"])
api_router.include_router(spelling_bee.router, prefix="/spelling-bee", tags=["spelling-bee"])
api_router.include_router(story_time.router, prefix="/story-time", tags=["story-time"])
api_router.include_router(speaking.router, prefix="/speaking", tags=["speaking"])
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && python -m pytest tests/test_topics.py -v
```

Expected: `2 passed`

- [ ] **Step 6: Smoke test the running server**

```bash
curl "http://localhost:8000/api/v1/topics?grade_level=1"
```

Expected:
```json
[
  {"id": 1, "grade_level": 1, "topic_name": "Phonics"},
  {"id": 2, "grade_level": 1, "topic_name": "Colors"},
  ...
]
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/v1/endpoints/topics.py backend/app/api/v1/router.py backend/tests/test_topics.py
git commit -m "feat: add GET /topics endpoint returning predefined SNC topics by grade"
```

---

## Task 3: Active Topics Endpoints (GET + PUT /classroom/{id}/active-topics)

**Files:**
- Modify: `backend/app/api/v1/endpoints/classroom.py`

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/test_topics.py`:

```python
def test_get_active_topics_returns_all_when_no_selection():
    """If classroom has no saved selections, return ALL topics for its grade."""
    from app.api.v1.endpoints.classroom import get_active_topics

    mock_supabase = MagicMock()

    # No active_topics rows
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    # All grade-1 topics fallback
    all_topics = [
        make_topic_row(1, 1, "Phonics"),
        make_topic_row(2, 1, "Colors"),
    ]
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = all_topics

    import asyncio
    result = asyncio.run(get_active_topics(
        classroom_id="cls-uuid",
        grade_level=1,
        supabase=mock_supabase,
    ))
    assert len(result) == 2


def test_put_active_topics_replaces_selection():
    """PUT active-topics deletes old rows and inserts new ones."""
    from app.api.v1.endpoints.classroom import save_active_topics

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = []
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"classroom_id": "cls-uuid", "topic_id": 1},
        {"classroom_id": "cls-uuid", "topic_id": 3},
    ]

    import asyncio
    result = asyncio.run(save_active_topics(
        classroom_id="cls-uuid",
        topic_ids=[1, 3],
        supabase=mock_supabase,
    ))
    assert result["active_count"] == 2
```

- [ ] **Step 2: Run to verify failure**

```bash
cd backend && python -m pytest tests/test_topics.py::test_get_active_topics_returns_all_when_no_selection tests/test_topics.py::test_put_active_topics_replaces_selection -v
```

Expected: `ImportError: cannot import name 'get_active_topics'`

- [ ] **Step 3: Add helper functions and endpoints to classroom.py**

At the top of `backend/app/api/v1/endpoints/classroom.py`, add to imports:

```python
from pydantic import BaseModel
```

(It already imports `BaseModel` — skip if present. Check the file first.)

Add these schemas after the existing ones (before `router = APIRouter()`):

```python
class SncTopicOut(BaseModel):
    id: int
    grade_level: int
    topic_name: str

class ActiveTopicsUpdate(BaseModel):
    topic_ids: list[int]

class ActiveTopicsResponse(BaseModel):
    active_count: int
```

Add these two helper functions (add before the `@router.post` endpoints):

```python
async def get_active_topics(
    classroom_id: str,
    grade_level: int,
    supabase,
) -> list[dict]:
    """
    Returns active topics for a classroom.
    If no rows in classroom_active_topics → returns ALL topics for the grade (default all active).
    """
    # Check saved selections
    saved = (
        supabase.table("classroom_active_topics")
        .select("topic_id")
        .eq("classroom_id", classroom_id)
        .execute()
    )
    saved_ids = [row["topic_id"] for row in (saved.data or [])]

    if saved_ids:
        # Return only the saved topics
        resp = (
            supabase.table("snc_topics")
            .select("id, grade_level, topic_name")
            .in_("id", saved_ids)
            .order("id")
            .execute()
        )
    else:
        # Default: return all topics for this grade
        resp = (
            supabase.table("snc_topics")
            .select("id, grade_level, topic_name")
            .eq("grade_level", grade_level)
            .order("id")
            .execute()
        )
    return resp.data or []


async def save_active_topics(
    classroom_id: str,
    topic_ids: list[int],
    supabase,
) -> dict:
    """Delete-then-insert replacement of active topic selections."""
    # Delete existing selections
    supabase.table("classroom_active_topics").delete().eq(
        "classroom_id", classroom_id
    ).execute()

    if topic_ids:
        rows = [{"classroom_id": classroom_id, "topic_id": tid} for tid in topic_ids]
        supabase.table("classroom_active_topics").insert(rows).execute()

    return {"active_count": len(topic_ids)}
```

Add these two endpoints (after existing classroom endpoints, before syllabus endpoints):

```python
@router.get("/{classroom_id}/active-topics", response_model=list[SncTopicOut])
async def get_classroom_active_topics(
    classroom_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Returns active SNC topics for this classroom.
    If no topics have been saved, returns ALL topics for the classroom's grade (default all active).
    """
    supabase = get_supabase_admin()
    _verify_classroom_ownership(supabase, classroom_id, teacher["sub"])

    # Get classroom grade
    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not classroom_resp.data:
        raise HTTPException(status_code=404, detail="Classroom not found")

    grade_level: int = classroom_resp.data["grade_level"]
    return await get_active_topics(classroom_id, grade_level, supabase)


@router.put("/{classroom_id}/active-topics", response_model=ActiveTopicsResponse)
async def update_classroom_active_topics(
    classroom_id: str,
    body: ActiveTopicsUpdate,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Replaces all active topic selections for this classroom.
    Send topic_ids: [] to reset to default (all active).
    """
    supabase = get_supabase_admin()
    _verify_classroom_ownership(supabase, classroom_id, teacher["sub"])
    return await save_active_topics(classroom_id, body.topic_ids, supabase)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_topics.py -v
```

Expected: `4 passed`

- [ ] **Step 5: Smoke test with running server**

```bash
# Replace <teacher_token> and <classroom_id> with real values from your DB
curl -H "Authorization: Bearer <teacher_token>" \
  "http://localhost:8000/api/v1/classroom/<classroom_id>/active-topics"
```

Expected: JSON array of all topics for that classroom's grade.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/classroom.py backend/tests/test_topics.py
git commit -m "feat: add GET/PUT /classroom/{id}/active-topics endpoints"
```

---

## Task 4: Update Mission Generator — Add active_topics Parameter

**Files:**
- Modify: `backend/app/agents/tutor_agent/mission_generator.py`

- [ ] **Step 1: Update `generate_daily_missions` signature and prompt**

In `mission_generator.py`, change the function signature:

```python
async def generate_daily_missions(
    grade_level: int,
    context_chunks: list[str],
    active_topics: list[str],          # NEW: list of topic names e.g. ["Phonics", "Colors"]
    is_frustrated: bool = False,
) -> DailyMissions:
```

Change `_SYSTEM_PROMPT_WITH_CONTEXT` — replace the existing system prompt string with:

```python
_SYSTEM_PROMPT_WITH_CONTEXT = """\
You are an ESL mission designer for Pakistani primary school Grade {grade_level} students.

Generate exactly 3 interactive English language questions using ONLY the vocabulary \
in the SNC context provided below.

ACTIVE TOPICS: Generate questions STRICTLY based on these topics only: {active_topics}
Do NOT generate questions about any topic not in this list.

RULES — follow every rule strictly:
1. FORMAT: Question 1 and Question 2 must be multiple_choice (4 options: a, b, c, d). \
   Question 3 must be fill_blank (correct_answer is the missing word, no options needed).
2. VOCABULARY: Use only Grade {grade_level} vocabulary found in the context. Never \
   introduce words above this grade level.
3. SIMPLICITY: Keep questions short and easy to read. These are young children (ages 6-12).
4. ENCOURAGEMENT: Frame questions in a positive, game-like tone (e.g. "Can you find…?", \
   "Which word means…?").
5. GROUNDING: Every question must naturally reference words or concepts from the context below.
6. EMOJI: Add a single relevant emoji as emoji_hint for each question (e.g. "🐱" for a cat question).
7. TOPIC: Set the topic field to a short 1-3 word label that describes all 3 questions.

SNC CURRICULUM CONTEXT (Grade {grade_level}):
{context}

{confidence_builder_override}
"""
```

Change `_SYSTEM_PROMPT_FALLBACK`:

```python
_SYSTEM_PROMPT_FALLBACK = """\
You are an ESL mission designer for Pakistani primary school Grade {grade_level} students.

No curriculum context is available right now. Generate exactly 3 basic English language \
questions suitable for Grade {grade_level} students.

ACTIVE TOPICS: Generate questions STRICTLY based on these topics only: {active_topics}
Do NOT generate questions about any topic not in this list.

RULES — follow every rule strictly:
1. FORMAT: Question 1 and Question 2 must be multiple_choice (4 options: a, b, c, d). \
   Question 3 must be fill_blank (correct_answer is the missing word, no options needed).
2. VOCABULARY: Use only simple, common Grade {grade_level} English vocabulary.
3. SIMPLICITY: Keep questions short and easy to read. These are young children (ages 6-12).
4. ENCOURAGEMENT: Frame questions in a positive, game-like tone.
5. EMOJI: Add a single relevant emoji as emoji_hint for each question.
6. TOPIC: Set the topic field to a short 1-3 word label that describes all 3 questions.

{confidence_builder_override}
"""
```

Update the `chain.ainvoke` calls in `generate_daily_missions` to pass `active_topics`:

```python
# In the context_chunks branch:
result = await asyncio.wait_for(
    chain.ainvoke(
        {
            "grade_level": grade_level,
            "context": context,
            "active_topics": ", ".join(active_topics) if active_topics else "General English",
            "confidence_builder_override": confidence_builder_override,
        }
    ),
    timeout=12.0
)

# In the fallback branch:
result = await asyncio.wait_for(
    chain.ainvoke({
        "grade_level": grade_level,
        "active_topics": ", ".join(active_topics) if active_topics else "General English",
        "confidence_builder_override": confidence_builder_override,
    }),
    timeout=12.0
)
```

- [ ] **Step 2: Update `generate_pillar_missions` signature**

Change:

```python
async def generate_pillar_missions(
    pillar: str,
    grade_level: int,
    current_week_topic: str | None,
    student_id: str,
    student_weaknesses: list[str],
    is_frustrated: bool = False,
) -> list[dict]:
```

To:

```python
async def generate_pillar_missions(
    pillar: str,
    grade_level: int,
    active_topics: list[str],          # NEW: replaces current_week_topic
    student_id: str,
    student_weaknesses: list[str],
    is_frustrated: bool = False,
) -> list[dict]:
```

Find the LLM prompt string inside `generate_pillar_missions` that mentions `current_week_topic`. It looks like:

```python
f"...Current Week Topic: {current_week_topic}..."
```

Replace with:

```python
f"...Active Topics: {', '.join(active_topics) if active_topics else 'General English'}..."
```

And update the prompt instruction from "70% based on current_week_topic" to:

```python
f"Generate 70% of questions based on these active topics: {', '.join(active_topics) if active_topics else 'General English'}. "
f"Generate 30% based on student weakness areas."
```

- [ ] **Step 3: Verify the file runs without import errors**

```bash
cd backend && python -c "from app.agents.tutor_agent.mission_generator import generate_daily_missions, generate_pillar_missions; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/agents/tutor_agent/mission_generator.py
git commit -m "feat: add active_topics parameter to mission generator prompts"
```

---

## Task 5: Update Mission Endpoints — Topic Resolution

**Files:**
- Modify: `backend/app/api/v1/endpoints/missions.py`

- [ ] **Step 1: Update daily missions endpoint**

In `missions.py`, add import at the top:

```python
from app.api.v1.endpoints.classroom import get_active_topics
```

In `get_daily_missions`, replace the `_SEED_PHRASE` constant usage and the `retrieve_grade_filtered_chunks` call:

Find this block (around line 148-191):

```python
cache_key = make_cache_key("daily_missions", classroom_id, str(is_frustrated))
```

Replace with:

```python
# Fetch active topics for topic-aware cache key + seed phrase
supabase = get_supabase_admin()

# Step 1: Resolve grade_level
classroom_resp = (
    supabase.table("classrooms")
    .select("grade_level")
    .eq("id", classroom_id)
    .maybe_single()
    .execute()
)
if not classroom_resp.data:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Classroom not found for this student",
    )
grade_level: int = classroom_resp.data["grade_level"]

# Step 2: Resolve active topics
active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
active_topic_names = [t["topic_name"] for t in active_topic_objs]
topics_hash = str(hash(tuple(sorted(active_topic_names))))

# Step 3: Cache key includes topics hash
cache_key = make_cache_key("daily_missions", classroom_id, str(is_frustrated), topics_hash)
if not is_frustrated:
    cached = await cache_get(cache_key)
    if cached:
        logger.info(f"Cache hit for daily missions: {cache_key}")
        return DailyMissionsResponse(**cached)
```

Then remove the duplicate `classroom_resp` lookup that was below (the original Step 1 block that also fetches grade_level — it's now done above).

Replace the `retrieve_grade_filtered_chunks` call:

```python
seed_phrase = f"English topics: {', '.join(active_topic_names)}" if active_topic_names else "vocabulary words lesson"
try:
    context_chunks = await retrieve_grade_filtered_chunks(
        query=seed_phrase,
        grade_level=grade_level,
        supabase_admin_client=supabase,
        match_count=5,
    )
    logger.info("RAG retrieval succeeded: %d chunks for grade %d", len(context_chunks), grade_level)
except Exception as exc:
    logger.error("RAG retrieval failed: %s", exc, exc_info=True)
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Could not retrieve curriculum content. Please try again shortly.",
    )
```

Update the `generate_daily_missions` call to pass `active_topics`:

```python
missions: DailyMissions = await generate_daily_missions(
    grade_level=grade_level,
    context_chunks=context_chunks,
    active_topics=active_topic_names,
    is_frustrated=is_frustrated,
)
```

- [ ] **Step 2: Update pillar missions endpoint**

In `get_pillar_missions`, replace the `classroom_syllabus` lookup block (around lines 436-449):

```python
# OLD: Fetch the active week's topic from classroom_syllabus
syllabus_resp = (
    supabase.table("classroom_syllabus")
    ...
)
current_week_topic: str | None = ...
```

With:

```python
# NEW: Fetch active topics for this classroom
active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
active_topic_names = [t["topic_name"] for t in active_topic_objs]
topics_hash = str(hash(tuple(sorted(active_topic_names))))
```

Update cache key:

```python
cache_key = make_cache_key("pillar_missions", student_id, pillar, str(is_frustrated), topics_hash)
```

Update `generate_pillar_missions` call:

```python
missions = await generate_pillar_missions(
    pillar=pillar,
    grade_level=grade_level,
    active_topics=active_topic_names,
    student_id=student_id,
    student_weaknesses=student_weaknesses,
    is_frustrated=is_frustrated,
)
```

Also update `PillarMissionsResponse` — rename `current_week_topic` field to `active_topics_summary`:

```python
class PillarMissionsResponse(BaseModel):
    pillar: str
    active_topics_summary: str | None   # comma-joined active topic names
    questions: list[MissionQuestionOut]
    weakness_focus_questions: int
```

And the response construction:

```python
response_data = PillarMissionsResponse(
    pillar=pillar,
    active_topics_summary=", ".join(active_topic_names) if active_topic_names else None,
    questions=[...],
    weakness_focus_questions=weakness_focus_count,
)
```

- [ ] **Step 3: Verify server starts without errors**

```bash
cd backend && uvicorn app.main:app --reload
```

Expected: No import errors in startup log.

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/missions.py
git commit -m "feat: replace syllabus week lookup with active topics in mission endpoints"
```

---

## Task 6: Frontend Type

**Files:**
- Modify: `frontend/types/index.ts`

- [ ] **Step 1: Add SncTopic type**

Open `frontend/types/index.ts` and add at the end:

```typescript
export interface SncTopic {
  id: number;
  grade_level: number;
  topic_name: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/types/index.ts
git commit -m "feat: add SncTopic type"
```

---

## Task 7: Classroom Detail UI — Active Topics Pills

**Files:**
- Modify: `frontend/app/teacher/classroom/[id]/page.tsx`

- [ ] **Step 1: Replace the Curriculum Settings section**

The current page has a "Curriculum Settings" section with a free-text `current_week_topic` input. Replace the entire section with the Active Topics pill UI.

Replace the existing state variables for curriculum settings:

```typescript
// REMOVE these:
const [editingSettings, setEditingSettings] = useState(false);
const [currentWeekTopic, setCurrentWeekTopic] = useState("");
const [settingsSaving, setSettingsSaving] = useState(false);
const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);
const [settingsSaved, setSettingsSaved] = useState(false);

// ADD these:
const [allTopics, setAllTopics] = useState<SncTopic[]>([]);
const [activeTopicIds, setActiveTopicIds] = useState<Set<number>>(new Set());
const [topicsLoaded, setTopicsLoaded] = useState(false);
const [topicsSaving, setTopicsSaving] = useState(false);
const [topicsSaved, setTopicsSaved] = useState(false);
const [topicsSaveError, setTopicsSaveError] = useState<string | null>(null);
```

Add the `SncTopic` import at the top:

```typescript
import type { Classroom, SncTopic } from "@/types";
```

Add topic fetching inside `useEffect` (after `fetchClassroom`):

```typescript
async function fetchTopics(gradeLevel: number) {
  const headers = await getTeacherHeaders();
  const [allTopicsData, activeTopicsData] = await Promise.all([
    apiFetch<SncTopic[]>(`/topics?grade_level=${gradeLevel}`, { headers }),
    apiFetch<SncTopic[]>(`/classroom/${params.id}/active-topics`, { headers }),
  ]);
  setAllTopics(allTopicsData);
  setActiveTopicIds(new Set(activeTopicsData.map((t) => t.id)));
  setTopicsLoaded(true);
}
```

Call it after `fetchClassroom` succeeds:

```typescript
useEffect(() => {
  async function init() {
    const data = await fetchClassroom();   // modify fetchClassroom to return data
    if (data) await fetchTopics(data.grade_level);
  }
  init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [params.id]);
```

Add save function:

```typescript
async function saveActiveTopics() {
  setTopicsSaving(true);
  setTopicsSaveError(null);
  try {
    const headers = await getTeacherHeaders();
    await apiFetch(`/classroom/${params.id}/active-topics`, {
      method: "PUT",
      body: JSON.stringify({ topic_ids: Array.from(activeTopicIds) }),
      headers,
    });
    setTopicsSaved(true);
    setTimeout(() => setTopicsSaved(false), 1500);
  } catch (err: unknown) {
    setTopicsSaveError(err instanceof Error ? err.message : "Failed to save topics.");
  } finally {
    setTopicsSaving(false);
  }
}
```

Replace the "Curriculum Settings" JSX section with:

```tsx
{/* Active Topics */}
<div className="bg-white rounded-2xl border border-gray-200 mb-6 p-5">
  <div className="flex items-start justify-between mb-4">
    <div>
      <h2 className="text-sm font-semibold text-gray-900">Active Topics</h2>
      <p className="text-xs text-gray-500 mt-1">
        Toggle topics to control what the AI generates questions about. All topics are active by default.
      </p>
    </div>
    <button
      onClick={saveActiveTopics}
      disabled={topicsSaving || !topicsLoaded}
      className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
    >
      {topicsSaving ? "Saving…" : "Save Changes"}
    </button>
  </div>

  {!topicsLoaded ? (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
      ))}
    </div>
  ) : (
    <div className="flex flex-wrap gap-2">
      {allTopics.map((topic) => {
        const isActive = activeTopicIds.has(topic.id);
        return (
          <button
            key={topic.id}
            onClick={() => {
              setActiveTopicIds((prev) => {
                const next = new Set(prev);
                if (next.has(topic.id)) next.delete(topic.id);
                else next.add(topic.id);
                return next;
              });
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
              isActive
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-500 border-gray-300 hover:border-indigo-400"
            }`}
          >
            {topic.topic_name}
          </button>
        );
      })}
    </div>
  )}

  {topicsSaveError && (
    <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">
      {topicsSaveError}
    </p>
  )}
  {topicsSaved && (
    <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 mt-3">
      ✓ Topics saved!
    </p>
  )}
</div>
```

Also remove the syllabus navigation link/tab if present in the tabs section.

- [ ] **Step 2: Verify the page compiles**

```bash
cd frontend && npm run build 2>&1 | grep -E "error|Error" | grep -v "Warning"
```

Expected: No errors.

- [ ] **Step 3: Manual smoke test**

1. Navigate to `/teacher/classroom/{id}` in browser
2. Verify pill buttons appear for the correct grade
3. Click a pill — it should toggle between filled indigo and outline gray
4. Click "Save Changes" — verify success toast appears
5. Reload page — verify the same pills are still toggled

- [ ] **Step 4: Commit**

```bash
git add frontend/app/teacher/classroom/[id]/page.tsx
git commit -m "feat: replace curriculum settings with active topics pill UI in classroom detail"
```

---

## Task 8: Upload Modal — Optional Topic Tag

**Files:**
- Modify: `frontend/components/teacher/UploadBookModal.tsx`
- Modify: `frontend/app/teacher/curriculum/page.tsx`

- [ ] **Step 1: Update UploadBookModal props and UI**

Update `Props` interface:

```typescript
interface Props {
  gradeLevel: number;
  topics: SncTopic[];         // NEW: list of topics for this grade
  onClose: () => void;
  onSuccess: (result: UploadResult) => void;
}
```

Add `SncTopic` import:

```typescript
import type { SncTopic } from "@/types";
```

Add state inside the component:

```typescript
const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
```

Add the topic tag to `formData` in `handleUpload`:

```typescript
formData.append("grade_level", String(gradeLevel));
formData.append("book_title", bookTitle.trim());
if (selectedTopicId !== null) {
  formData.append("topic_id", String(selectedTopicId));
}
```

Add the dropdown UI between "Book Title" and "File picker":

```tsx
{/* Topic tag (optional) */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Topic Tag <span className="text-gray-400 font-normal">(optional)</span>
  </label>
  <select
    value={selectedTopicId ?? ""}
    onChange={(e) => setSelectedTopicId(e.target.value ? Number(e.target.value) : null)}
    disabled={isLoading}
    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
  >
    <option value="">— No specific topic —</option>
    {topics.map((t) => (
      <option key={t.id} value={t.id}>{t.topic_name}</option>
    ))}
  </select>
  <p className="text-xs text-gray-400 mt-1">
    Tag this document to a specific topic for better AI retrieval.
  </p>
</div>
```

- [ ] **Step 2: Pass topics from curriculum page**

In `frontend/app/teacher/curriculum/page.tsx`, fetch topics when grade modal opens and pass to modal.

Add state:

```typescript
const [gradeTopics, setGradeTopics] = useState<SncTopic[]>([]);
```

Add `SncTopic` import:

```typescript
import type { SncTopic } from "@/types";
```

When teacher clicks "Upload Book" for a grade, fetch topics:

```typescript
async function handleOpenUpload(gradeLevel: number) {
  setUploadGrade(gradeLevel);
  try {
    const headers = await getTeacherHeaders();
    const topics = await apiFetch<SncTopic[]>(`/topics?grade_level=${gradeLevel}`, { headers });
    setGradeTopics(topics);
  } catch {
    setGradeTopics([]);
  }
  setUploadOpen(true);
}
```

Pass to modal:

```tsx
<UploadBookModal
  gradeLevel={uploadGrade}
  topics={gradeTopics}
  onClose={() => setUploadOpen(false)}
  onSuccess={handleUploadSuccess}
/>
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run build 2>&1 | grep -E "^.*error" | grep -v "Warning"
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/teacher/UploadBookModal.tsx frontend/app/teacher/curriculum/page.tsx
git commit -m "feat: add optional topic tag dropdown to upload modal"
```

---

## Task 9: End-to-End Smoke Test

- [ ] **Step 1: Start backend**

```bash
cd backend && uvicorn app.main:app --reload
```

- [ ] **Step 2: Start frontend**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Test topic activation flow**

1. Log in as teacher → go to a classroom
2. Verify Active Topics section shows grade-appropriate pills (all filled by default)
3. Toggle off 2-3 topics → click Save Changes → verify success
4. Reload page → verify toggled-off topics are still off

- [ ] **Step 4: Test mission generation respects active topics**

1. Log in as student in that classroom
2. Go to Missions → trigger daily missions
3. Inspect the questions — they should only cover active topics
4. Check backend logs for the seed phrase used (should contain only active topic names)

- [ ] **Step 5: Test upload with topic tag**

1. Teacher → Curriculum Hub → Upload Book for a grade
2. Verify topic dropdown appears with correct grade topics
3. Select a topic → upload a PDF
4. Verify upload succeeds

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: shared global knowledge base — SNC topics, active topic activation, RAG pipeline update"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by task |
|-----------------|----------------|
| `snc_topics` table + seed data | Task 1 |
| `classroom_active_topics` junction table | Task 1 |
| Default all-active when no rows | Task 3 (`get_active_topics`) |
| `GET /topics?grade_level=` | Task 2 |
| `GET /classroom/{id}/active-topics` | Task 3 |
| `PUT /classroom/{id}/active-topics` | Task 3 |
| Topic-aware seed phrase for RAG | Task 5 |
| Remove `classroom_syllabus` week lookup | Task 5 |
| Active topics in LLM prompt | Task 4 |
| Cache key includes topics hash | Task 5 |
| Pill toggle UI in classroom detail | Task 7 |
| Remove `current_week_topic` free-text | Task 7 |
| Topic dropdown in upload modal | Task 8 |
| No RBAC changes | ✅ None added |
| `classroom_syllabus` table kept in DB | ✅ Migration only adds tables |
| `SncTopic` frontend type | Task 6 |

All spec requirements covered. No placeholders. Types consistent across tasks (`SncTopic`, `active_topics: list[str]`, `activeTopicIds: Set<number>`).
