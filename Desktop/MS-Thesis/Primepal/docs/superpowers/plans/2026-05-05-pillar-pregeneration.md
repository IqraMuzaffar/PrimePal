# Pillar Mission Pre-Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-generate generic pillar missions when teachers update active topics, so students get instant responses from cache instead of waiting 2-4s for LLM generation.

**Architecture:** Hook into the existing `update_classroom_active_topics()` endpoint via `BackgroundTasks` to fire a new `pregenerate_pillar_missions()` function. This function generates 4 generic pillar mission sets (reading, writing, listening, speaking) and caches them under classroom-level keys. The existing `get_pillar_missions()` endpoint gains a fallback that checks the generic cache when the student-specific cache misses, then triggers background personalization.

**Tech Stack:** FastAPI BackgroundTasks, Redis (aioredis), OpenAI gpt-4o-mini (via existing `generate_pillar_missions`), Pydantic, pytest + unittest.mock

---

## File Structure

| File | Role |
|------|------|
| **Create:** `backend/app/utils/pregenerate_missions.py` | Pre-generation logic: fetches grade/topics, calls LLM for 4 pillars, caches results |
| **Create:** `backend/tests/test_pregenerate_missions.py` | Unit tests for pre-generation function and generic cache fallback |
| **Modify:** `backend/app/api/v1/endpoints/classroom.py:508-521` | Add BackgroundTasks to topic update endpoint, fire pre-gen |
| **Modify:** `backend/app/api/v1/endpoints/missions.py:752-760` | Add generic cache fallback before on-demand generation |

---

### Task 1: Pre-Generation Utility Module

**Files:**
- Create: `backend/app/utils/pregenerate_missions.py`
- Test: `backend/tests/test_pregenerate_missions.py`

- [ ] **Step 1: Write the failing test for `pregenerate_pillar_missions`**

Create `backend/tests/test_pregenerate_missions.py`:

```python
"""
Tests for pillar mission pre-generation utility.

Covers:
  - Pre-generates all 4 pillars when called
  - Skips pillars that already have a cached generic entry
  - Handles empty active topics (skips pre-gen entirely)
  - Handles LLM failure for one pillar (others still cache)

Patching conventions:
  - Supabase:           app.utils.pregenerate_missions.get_supabase_admin
  - Mission generator:  app.utils.pregenerate_missions.generate_pillar_missions
  - Active topics:      app.utils.pregenerate_missions.get_active_topics
  - Cache:              app.utils.pregenerate_missions.cache_get / cache_set
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call

from app.agents.tutor_agent.mission_generator import MissionQuestion, QuestionOption


# ── Constants ────────────────────────────────────────────────────────────────

CLASSROOM_ID = "cccccccc-0000-0000-0000-000000000001"
GRADE_LEVEL = 3
ACTIVE_TOPICS = [
    {"id": 1, "topic_name": "Animals", "grade_level": 3, "skill": "reading"},
    {"id": 2, "topic_name": "Colours", "grade_level": 3, "skill": "writing"},
]
PILLARS = ["reading", "writing", "listening", "speaking"]


def _make_mock_questions(pillar: str) -> list[dict]:
    """Create 10 mock pillar question dicts."""
    questions = []
    for i in range(10):
        q = MissionQuestion(
            id=i + 1,
            task_type="sentence_picture_match",
            pillar=pillar,
            question=f"Sample {pillar} question {i + 1}",
            difficulty="medium",
            points_value=10,
            correct_answer="a",
            emoji_hint="📖",
            options=[
                QuestionOption(id="a", text="Option A"),
                QuestionOption(id="b", text="Option B"),
                QuestionOption(id="c", text="Option C"),
                QuestionOption(id="d", text="Option D"),
            ],
        )
        questions.append(q.model_dump())
    return questions


def _make_classroom_mock(grade_level=GRADE_LEVEL):
    """Mock supabase that returns a classroom with given grade_level."""
    mock_client = MagicMock()
    classroom_result = MagicMock()
    classroom_result.data = {"grade_level": grade_level}
    (
        mock_client.table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value
    ) = classroom_result
    return mock_client


# ── Tests ────────────────────────────────────────────────────────────────────


class TestPregeneratePillarMissions:
    """Tests for the pregenerate_pillar_missions function."""

    @pytest.mark.asyncio
    @patch("app.utils.pregenerate_missions.cache_set", new_callable=AsyncMock, return_value=True)
    @patch("app.utils.pregenerate_missions.cache_get", new_callable=AsyncMock, return_value=None)
    @patch("app.utils.pregenerate_missions.generate_pillar_missions", new_callable=AsyncMock)
    @patch("app.utils.pregenerate_missions.get_active_topics", new_callable=AsyncMock, return_value=ACTIVE_TOPICS)
    @patch("app.utils.pregenerate_missions.get_supabase_admin")
    async def test_generates_all_four_pillars(
        self, mock_supabase, mock_topics, mock_generate, mock_cache_get, mock_cache_set,
    ):
        """Should call generate_pillar_missions once per pillar."""
        mock_supabase.return_value = _make_classroom_mock()
        mock_generate.side_effect = lambda pillar, **kw: _make_mock_questions(pillar)

        from app.utils.pregenerate_missions import pregenerate_pillar_missions
        await pregenerate_pillar_missions(CLASSROOM_ID)

        assert mock_generate.call_count == 4
        called_pillars = [c.kwargs["pillar"] for c in mock_generate.call_args_list]
        assert set(called_pillars) == set(PILLARS)

    @pytest.mark.asyncio
    @patch("app.utils.pregenerate_missions.cache_set", new_callable=AsyncMock, return_value=True)
    @patch("app.utils.pregenerate_missions.cache_get", new_callable=AsyncMock)
    @patch("app.utils.pregenerate_missions.generate_pillar_missions", new_callable=AsyncMock)
    @patch("app.utils.pregenerate_missions.get_active_topics", new_callable=AsyncMock, return_value=ACTIVE_TOPICS)
    @patch("app.utils.pregenerate_missions.get_supabase_admin")
    async def test_skips_pillar_when_cache_exists(
        self, mock_supabase, mock_topics, mock_generate, mock_cache_get, mock_cache_set,
    ):
        """Should skip LLM call if generic cache already exists for a pillar."""
        mock_supabase.return_value = _make_classroom_mock()
        mock_generate.side_effect = lambda pillar, **kw: _make_mock_questions(pillar)

        # reading and writing already cached, listening and speaking not
        def cache_side_effect(key):
            if "reading" in key or "writing" in key:
                return {"pillar": "cached"}
            return None

        mock_cache_get.side_effect = cache_side_effect

        from app.utils.pregenerate_missions import pregenerate_pillar_missions
        await pregenerate_pillar_missions(CLASSROOM_ID)

        assert mock_generate.call_count == 2
        called_pillars = [c.kwargs["pillar"] for c in mock_generate.call_args_list]
        assert "reading" not in called_pillars
        assert "writing" not in called_pillars
        assert "listening" in called_pillars
        assert "speaking" in called_pillars

    @pytest.mark.asyncio
    @patch("app.utils.pregenerate_missions.cache_set", new_callable=AsyncMock, return_value=True)
    @patch("app.utils.pregenerate_missions.cache_get", new_callable=AsyncMock, return_value=None)
    @patch("app.utils.pregenerate_missions.generate_pillar_missions", new_callable=AsyncMock)
    @patch("app.utils.pregenerate_missions.get_active_topics", new_callable=AsyncMock, return_value=[])
    @patch("app.utils.pregenerate_missions.get_supabase_admin")
    async def test_skips_when_no_active_topics(
        self, mock_supabase, mock_topics, mock_generate, mock_cache_get, mock_cache_set,
    ):
        """Should skip pre-generation entirely when no active topics exist."""
        mock_supabase.return_value = _make_classroom_mock()

        from app.utils.pregenerate_missions import pregenerate_pillar_missions
        await pregenerate_pillar_missions(CLASSROOM_ID)

        mock_generate.assert_not_called()
        mock_cache_set.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.utils.pregenerate_missions.cache_set", new_callable=AsyncMock, return_value=True)
    @patch("app.utils.pregenerate_missions.cache_get", new_callable=AsyncMock, return_value=None)
    @patch("app.utils.pregenerate_missions.generate_pillar_missions", new_callable=AsyncMock)
    @patch("app.utils.pregenerate_missions.get_active_topics", new_callable=AsyncMock, return_value=ACTIVE_TOPICS)
    @patch("app.utils.pregenerate_missions.get_supabase_admin")
    async def test_one_pillar_failure_does_not_block_others(
        self, mock_supabase, mock_topics, mock_generate, mock_cache_get, mock_cache_set,
    ):
        """If one pillar LLM call fails, the others should still be cached."""
        mock_supabase.return_value = _make_classroom_mock()

        call_count = 0
        async def generate_side_effect(pillar, **kw):
            nonlocal call_count
            call_count += 1
            if pillar == "writing":
                raise Exception("LLM timeout")
            return _make_mock_questions(pillar)

        mock_generate.side_effect = generate_side_effect

        from app.utils.pregenerate_missions import pregenerate_pillar_missions
        await pregenerate_pillar_missions(CLASSROOM_ID)

        # 4 attempts (all pillars), but only 3 cache_set calls (writing failed)
        assert mock_generate.call_count == 4
        assert mock_cache_set.call_count == 3
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_pregenerate_missions.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.utils.pregenerate_missions'`

- [ ] **Step 3: Write the pre-generation module**

Create `backend/app/utils/pregenerate_missions.py`:

```python
"""
Pre-generate generic pillar missions for a classroom.

Called as a background task when a teacher updates active topics.
Generates 4 pillar mission sets (reading, writing, listening, speaking)
and caches them under classroom-level keys so students get instant responses.
"""
import asyncio
import hashlib
import logging

from app.api.v1.endpoints.classroom import get_active_topics
from app.agents.tutor_agent.mission_generator import generate_pillar_missions, MissionQuestion
from app.core.cache import cache_get, cache_set, make_cache_key
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

PILLARS = ["reading", "writing", "listening", "speaking"]


def _build_generic_cache_key(classroom_id: str, pillar: str, topics_hash: str) -> str:
    """Build the generic (classroom-level) cache key for pre-generated missions."""
    return make_cache_key("pillar_missions_generic", classroom_id, pillar, topics_hash)


async def pregenerate_pillar_missions(classroom_id: str) -> None:
    """
    Pre-generate generic pillar missions for all 4 pillars.

    Fetches grade_level and active topics, then generates missions sequentially
    (with 1s delay between pillars to avoid OpenAI rate limits).
    Skips pillars that already have a cached generic entry.
    Failures are logged but never raised — this is a best-effort optimization.
    """
    try:
        supabase = get_supabase_admin()

        # Fetch grade level
        classroom_resp = (
            supabase.table("classrooms")
            .select("grade_level")
            .eq("id", classroom_id)
            .maybe_single()
            .execute()
        )
        if not classroom_resp.data:
            logger.error("Pre-gen: classroom %s not found", classroom_id)
            return

        grade_level: int = classroom_resp.data["grade_level"]

        # Resolve active topics
        active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
        active_topic_names = [t["topic_name"] for t in active_topic_objs]

        if not active_topic_names:
            logger.info("Pre-gen: no active topics for classroom %s, skipping", classroom_id)
            return

        topics_hash = hashlib.md5(
            ",".join(sorted(active_topic_names)).encode()
        ).hexdigest()[:12]

        logger.info(
            "Pre-gen: starting for classroom %s, grade %d, %d topics, hash %s",
            classroom_id, grade_level, len(active_topic_names), topics_hash,
        )

        generated = 0
        for i, pillar in enumerate(PILLARS):
            try:
                # Skip if already cached
                cache_key = _build_generic_cache_key(classroom_id, pillar, topics_hash)
                existing = await cache_get(cache_key)
                if existing:
                    logger.info("Pre-gen: %s already cached, skipping", pillar)
                    continue

                # Delay between calls to avoid rate limits (skip first)
                if i > 0 and generated > 0:
                    await asyncio.sleep(1)

                missions = await generate_pillar_missions(
                    pillar=pillar,
                    grade_level=grade_level,
                    active_topics=active_topic_names,
                    student_id="generic",
                    student_weaknesses=[],
                    is_frustrated=False,
                    performance_profile=None,
                )

                if not missions:
                    logger.warning("Pre-gen: %s returned empty, skipping cache", pillar)
                    continue

                # Build response dict matching PillarMissionsResponse shape
                from app.api.v1.endpoints.missions import _strip_answer, MissionQuestion as MQ

                mission_questions = []
                for q in missions:
                    if isinstance(q, dict):
                        q_filtered = {k: v for k, v in q.items() if k != "is_weakness_focused"}
                        if "type" in q_filtered and "task_type" not in q_filtered:
                            q_filtered["task_type"] = q_filtered.pop("type")
                        mission_questions.append(MQ(**q_filtered))
                    else:
                        mission_questions.append(q)

                response_dict = {
                    "pillar": pillar,
                    "active_topics_summary": ", ".join(active_topic_names),
                    "questions": [_strip_answer(q).model_dump() for q in mission_questions],
                    "weakness_focus_questions": 0,
                }

                await cache_set(cache_key, response_dict, ttl=3600)
                generated += 1
                logger.info("Pre-gen: %s cached successfully (%d questions)", pillar, len(missions))

            except Exception as exc:
                logger.error("Pre-gen: %s failed: %s", pillar, exc, exc_info=True)
                continue

        logger.info("Pre-gen: completed for classroom %s — %d/%d pillars cached", classroom_id, generated, len(PILLARS))

    except Exception as exc:
        logger.error("Pre-gen: fatal error for classroom %s: %s", classroom_id, exc, exc_info=True)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_pregenerate_missions.py -v`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/utils/pregenerate_missions.py backend/tests/test_pregenerate_missions.py
git commit -m "feat(missions): add pillar mission pre-generation utility"
```

---

### Task 2: Hook Pre-Generation into Topic Update Endpoint

**Files:**
- Modify: `backend/app/api/v1/endpoints/classroom.py:508-521`
- Test: `backend/tests/test_pregenerate_missions.py` (add new test class)

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_pregenerate_missions.py`:

```python
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.security import get_current_teacher


# ── Constants for endpoint test ──────────────────────────────────────────────

TEACHER_ID = "tttttttt-0000-0000-0000-000000000001"

MOCK_TEACHER = {
    "id": TEACHER_ID,
    "email": "teacher@test.com",
    "is_admin": False,
}


class TestTopicUpdateTriggersPregen:
    """Tests that PUT /{classroom_id}/active-topics fires pre-generation."""

    @pytest.mark.asyncio
    @patch("app.api.v1.endpoints.classroom.pregenerate_pillar_missions", new_callable=AsyncMock)
    @patch("app.api.v1.endpoints.classroom.get_supabase_admin")
    async def test_topic_update_fires_pregen_background_task(
        self, mock_supabase, mock_pregen,
    ):
        """PUT active-topics should schedule pre-generation as a background task."""
        mock_client = MagicMock()
        mock_supabase.return_value = mock_client

        # Mock delete chain (delete-then-insert in save_active_topics)
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock()
        mock_client.table.return_value.insert.return_value.execute.return_value = MagicMock()

        app.dependency_overrides[get_current_teacher] = lambda: MOCK_TEACHER

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.put(
                    f"/api/v1/classrooms/{CLASSROOM_ID}/active-topics",
                    json={"topic_ids": [1, 2, 3]},
                )

            assert resp.status_code == 200
            # Background task should have been called with the classroom_id
            # (FastAPI runs background tasks after response is sent;
            #  in test mode with AsyncClient they run inline)
            mock_pregen.assert_awaited_once_with(CLASSROOM_ID)
        finally:
            app.dependency_overrides.pop(get_current_teacher, None)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_pregenerate_missions.py::TestTopicUpdateTriggersPregen -v`
Expected: FAIL — `pregenerate_pillar_missions` not imported in `classroom.py`

- [ ] **Step 3: Modify the topic update endpoint**

In `backend/app/api/v1/endpoints/classroom.py`, add the import at the top (with other imports):

```python
from app.utils.pregenerate_missions import pregenerate_pillar_missions
```

Then modify the `update_classroom_active_topics` function (lines 508-521) from:

```python
@router.put("/{classroom_id}/active-topics", response_model=ActiveTopicsResponse)
async def update_classroom_active_topics(
    classroom_id: str,
    body: ActiveTopicsUpdate,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Replaces all active topic selections for this classroom.
    Send topic_ids: [] to reset to default (all active).

    Any authenticated teacher can update topic selections.
    """
    supabase = get_supabase_admin()
    return await save_active_topics(classroom_id, body.topic_ids, supabase)
```

To:

```python
@router.put("/{classroom_id}/active-topics", response_model=ActiveTopicsResponse)
async def update_classroom_active_topics(
    classroom_id: str,
    body: ActiveTopicsUpdate,
    background_tasks: BackgroundTasks,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Replaces all active topic selections for this classroom.
    Send topic_ids: [] to reset to default (all active).

    Any authenticated teacher can update topic selections.
    Fires background pre-generation of pillar missions for the new topics.
    """
    supabase = get_supabase_admin()
    result = await save_active_topics(classroom_id, body.topic_ids, supabase)

    # Pre-generate pillar missions in background so students get instant responses
    background_tasks.add_task(pregenerate_pillar_missions, classroom_id)

    return result
```

Also verify `BackgroundTasks` is already imported. Check the existing imports — if not present, add:

```python
from fastapi import BackgroundTasks
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_pregenerate_missions.py::TestTopicUpdateTriggersPregen -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/classroom.py backend/tests/test_pregenerate_missions.py
git commit -m "feat(missions): trigger pillar pre-generation on topic update"
```

---

### Task 3: Add Generic Cache Fallback to Pillar Endpoint

**Files:**
- Modify: `backend/app/api/v1/endpoints/missions.py:752-760`
- Test: `backend/tests/test_pregenerate_missions.py` (add new test class)

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_pregenerate_missions.py`:

```python
from app.core.security import get_current_student


class TestGenericCacheFallback:
    """Tests that GET /missions/pillar falls back to generic cache."""

    MOCK_STUDENT = {
        "sub": "dddddddd-0000-0000-0000-000000000001",
        "classroom_id": CLASSROOM_ID,
        "role": "student",
    }

    MOCK_GENERIC_RESPONSE = {
        "pillar": "reading",
        "active_topics_summary": "Animals, Colours",
        "questions": [
            {
                "id": i + 1,
                "task_type": "sentence_picture_match",
                "pillar": "reading",
                "question": f"Pre-gen question {i + 1}",
                "difficulty": "medium",
                "points_value": 10,
                "emoji_hint": "📖",
                "options": [
                    {"id": "a", "text": "A", "emoji": None},
                    {"id": "b", "text": "B", "emoji": None},
                    {"id": "c", "text": "C", "emoji": None},
                    {"id": "d", "text": "D", "emoji": None},
                ],
                "passage": None,
                "audio_text": None,
                "image_context": None,
                "image_options": None,
                "word_bank": None,
                "word_with_blanks": None,
                "letter_options": None,
                "sentence_start": None,
                "urdu_hint": "",
                "correct_order": None,
                "correct_answer": "a",
            }
            for i in range(10)
        ],
        "weakness_focus_questions": 0,
    }

    @pytest.mark.asyncio
    @patch("app.api.v1.endpoints.missions.cache_set", new_callable=AsyncMock, return_value=True)
    @patch("app.api.v1.endpoints.missions.cache_get", new_callable=AsyncMock)
    @patch("app.api.v1.endpoints.missions.get_active_topics", new_callable=AsyncMock)
    @patch("app.api.v1.endpoints.missions.get_student_performance_profile", new_callable=AsyncMock, return_value=None)
    @patch("app.api.v1.endpoints.missions.get_supabase_admin")
    async def test_falls_back_to_generic_cache(
        self, mock_supabase, mock_perf, mock_topics, mock_cache_get, mock_cache_set,
    ):
        """When student cache misses but generic cache hits, return generic response."""
        # Setup supabase mocks
        mock_client = MagicMock()
        mock_supabase.return_value = mock_client

        def table_side_effect(table_name):
            table_mock = MagicMock()
            if table_name == "classrooms":
                result = MagicMock()
                result.data = {"grade_level": 3}
                table_mock.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = result
            elif table_name == "student_interactions":
                result = MagicMock()
                result.data = []
                table_mock.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = result
            return table_mock

        mock_client.table.side_effect = table_side_effect

        mock_topics.return_value = [
            {"id": 1, "topic_name": "Animals", "grade_level": 3, "skill": "reading"},
            {"id": 2, "topic_name": "Colours", "grade_level": 3, "skill": "writing"},
        ]

        # First cache_get (student-specific) returns None, second (generic) returns data
        call_num = 0
        async def cache_get_side_effect(key):
            nonlocal call_num
            call_num += 1
            if "pillar_missions_generic" in key:
                return self.MOCK_GENERIC_RESPONSE
            return None  # student-specific cache miss

        mock_cache_get.side_effect = cache_get_side_effect

        app.dependency_overrides[get_current_student] = lambda: self.MOCK_STUDENT

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get("/api/v1/missions/pillar?pillar=reading")

            assert resp.status_code == 200
            data = resp.json()
            assert data["pillar"] == "reading"
            assert len(data["questions"]) == 10
            assert data["questions"][0]["question"] == "Pre-gen question 1"
        finally:
            app.dependency_overrides.pop(get_current_student, None)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_pregenerate_missions.py::TestGenericCacheFallback -v`
Expected: FAIL — the endpoint doesn't check `pillar_missions_generic` key yet

- [ ] **Step 3: Modify the pillar endpoint to add generic cache fallback**

In `backend/app/api/v1/endpoints/missions.py`, add the import at the top:

```python
from app.utils.pregenerate_missions import _build_generic_cache_key
```

Then modify the cache check section (lines 752-760). Replace:

```python
    # ------------------------------------------------------------------
    # Step 0: Check cache (only if not frustrated — frustrated students need fresh questions)
    # ------------------------------------------------------------------
    cache_key = make_cache_key("pillar_missions", student_id, pillar, str(is_frustrated), topics_hash)
    if not is_frustrated:
        cached = await cache_get(cache_key)
        if cached:
            logger.info(f"Cache hit for pillar missions: {cache_key}")
            return PillarMissionsResponse(**cached)
```

With:

```python
    # ------------------------------------------------------------------
    # Step 0: Check cache (only if not frustrated — frustrated students need fresh questions)
    # ------------------------------------------------------------------
    cache_key = make_cache_key("pillar_missions", student_id, pillar, str(is_frustrated), topics_hash)
    if not is_frustrated:
        # Check student-specific cache first
        cached = await cache_get(cache_key)
        if cached:
            logger.info(f"Cache hit for pillar missions (student): {cache_key}")
            return PillarMissionsResponse(**cached)

        # Fallback: check generic classroom-level cache (pre-generated)
        generic_key = _build_generic_cache_key(classroom_id, pillar, topics_hash)
        generic_cached = await cache_get(generic_key)
        if generic_cached:
            logger.info(f"Cache hit for pillar missions (generic): {generic_key}")
            # Trigger background personalization for next request
            background_tasks.add_task(
                _generate_personalized_missions,
                student_id, classroom_id, pillar, grade_level,
                active_topic_names, student_weaknesses, performance_profile,
                cache_key,
            )
            return PillarMissionsResponse(**generic_cached)
```

Also add a `background_tasks` parameter to the endpoint function signature. Change:

```python
async def get_pillar_missions(
    pillar: str = Query(..., description="Pillar type: reading, writing, listening, speaking"),
    is_frustrated: bool = Query(False, description="If True, generate 'Confidence Builder' questions to recover affective state"),
    student: dict = Depends(get_current_student),
):
```

To:

```python
async def get_pillar_missions(
    pillar: str = Query(..., description="Pillar type: reading, writing, listening, speaking"),
    is_frustrated: bool = Query(False, description="If True, generate 'Confidence Builder' questions to recover affective state"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    student: dict = Depends(get_current_student),
):
```

Then add the background personalization helper function above the endpoint (after the `_strip_answer` function):

```python
async def _generate_personalized_missions(
    student_id: str,
    classroom_id: str,
    pillar: str,
    grade_level: int,
    active_topic_names: list[str],
    student_weaknesses: list[str],
    performance_profile: dict | None,
    cache_key: str,
) -> None:
    """Background task: generate personalized pillar missions and cache them."""
    try:
        missions = await generate_pillar_missions(
            pillar=pillar,
            grade_level=grade_level,
            active_topics=active_topic_names,
            student_id=student_id,
            student_weaknesses=student_weaknesses,
            is_frustrated=False,
            performance_profile=performance_profile,
        )
        if not missions:
            return

        weakness_focus_count = sum(
            1 for q in missions if q.get("is_weakness_focused", False)
        )

        mission_questions = []
        for q in missions:
            if isinstance(q, dict):
                q_filtered = {k: v for k, v in q.items() if k != "is_weakness_focused"}
                if "type" in q_filtered and "task_type" not in q_filtered:
                    q_filtered["task_type"] = q_filtered.pop("type")
                mission_questions.append(MissionQuestion(**q_filtered))
            else:
                mission_questions.append(q)

        response = PillarMissionsResponse(
            pillar=pillar,
            active_topics_summary=", ".join(active_topic_names) if active_topic_names else None,
            questions=[_strip_answer(q) for q in mission_questions],
            weakness_focus_questions=weakness_focus_count,
        )
        await cache_set(cache_key, response.model_dump(), ttl=3600)
        logger.info("Background personalization cached for student %s pillar %s", student_id, pillar)
    except Exception as exc:
        logger.error("Background personalization failed for student %s pillar %s: %s", student_id, pillar, exc)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_pregenerate_missions.py -v`
Expected: All tests PASS (including the new fallback test)

- [ ] **Step 5: Run the full existing pillar missions test suite to check for regressions**

Run: `cd backend && python -m pytest tests/test_pillar_missions.py -v`
Expected: All existing tests still PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/missions.py backend/tests/test_pregenerate_missions.py
git commit -m "feat(missions): add generic cache fallback with background personalization"
```

---

### Task 4: Run Full Test Suite and Final Verification

**Files:**
- No new files — verification only

- [ ] **Step 1: Run all pre-generation tests**

Run: `cd backend && python -m pytest tests/test_pregenerate_missions.py -v`
Expected: All 5 tests PASS

- [ ] **Step 2: Run existing mission tests for regressions**

Run: `cd backend && python -m pytest tests/test_missions.py tests/test_pillar_missions.py -v`
Expected: All existing tests PASS (some may fail due to pre-existing API key issues — those are known failures, not regressions)

- [ ] **Step 3: Run chat tests to verify no import breakage**

Run: `cd backend && python -m pytest tests/test_chat.py -v`
Expected: All 6 chat tests PASS

- [ ] **Step 4: Commit the spec and plan docs**

```bash
git add docs/superpowers/specs/2026-05-05-pillar-pregeneration-design.md docs/superpowers/plans/2026-05-05-pillar-pregeneration.md
git commit -m "docs: add pillar pre-generation design spec and implementation plan"
```
