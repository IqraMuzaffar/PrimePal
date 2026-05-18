"""
Rigorous student-side tests for Story Time repetition fixes.

Covers:
  1. Per-session cache key — sessions 0 and 1 get different cache slots
  2. Question pool — LLM generates 8, student sees 3 random ones
  3. Daily limit enforcement — 429 after 2 sessions
  4. Cache hit — returns stored data without LLM call
  5. Question validation — rejects malformed LLM output
  6. Answer submission — correct/incorrect scoring
  7. Response schema — all required fields present
"""
import json
import random
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.cache import make_cache_key
from app.core.security import get_current_student
from app.main import app


# ── Constants ─────────────────────────────────────────────────────────────────

CLASSROOM_ID = "aaaaaaaa-0000-0000-0000-000000000001"
STUDENT_ID = "bbbbbbbb-0000-0000-0000-000000000001"
TOPIC = "Animals"
GRADE = 3

STUDENT_PAYLOAD = {
    "sub": STUDENT_ID,
    "classroom_id": CLASSROOM_ID,
    "student_name": "Ali",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_supabase_mock(session_count: int = 0, student_points: int = 50):
    """Supabase mock returning classroom, syllabus, interactions, and student data."""
    mock = MagicMock()

    def _table(name):
        tbl = MagicMock()
        if name == "classrooms":
            result = MagicMock()
            result.data = {"grade_level": GRADE}
            tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = result
        elif name == "classroom_syllabus":
            result = MagicMock()
            result.data = {"topic_title": TOPIC, "week_number": 2}
            tbl.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.maybe_single.return_value.execute.return_value = result
        elif name == "student_interactions":
            result = MagicMock()
            result.count = session_count
            tbl.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value = result
            tbl.insert.return_value.execute.return_value = MagicMock()
        elif name == "students":
            result = MagicMock()
            result.data = {"points": student_points}
            tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = result
        return tbl

    mock.table.side_effect = _table
    # Mock RPC for increment_student_points
    rpc_result = MagicMock()
    rpc_result.data = [{"new_points": student_points + 10}]
    mock.rpc.return_value.execute.return_value = rpc_result
    return mock


def _make_llm_response(num_questions: int = 8):
    """Build a valid LLM JSON response with the given number of questions."""
    questions = [
        {
            "id": i + 1,
            "question": f"What is answer number {i + 1}?",
            "options": [f"Option A{i}", f"Option B{i}", f"Option C{i}", f"Option D{i}"],
            "correct_index": i % 4,
        }
        for i in range(num_questions)
    ]
    return {
        "story_title": "The Clever Fox",
        "story_text": "A fox lived in a forest. It was very clever. One day it found some grapes.",
        "questions": questions,
    }


def _mock_openai_completion(llm_data: dict):
    """Build a mock OpenAI completion from a dict."""
    mock_completion = MagicMock()
    mock_completion.choices = [MagicMock()]
    mock_completion.choices[0].message.content = json.dumps(llm_data)
    mock_completion.usage = MagicMock(prompt_tokens=100, completion_tokens=300, total_tokens=400)
    return mock_completion


def _story_endpoint_patches(mock_sb, mock_completion=None, cached_response=None):
    """Return a dict of context managers for patching the story endpoint."""
    cache_return = cached_response

    patches = {
        "sb": patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
        "cache_get": patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=cache_return),
        "cache_set": patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
        "log_cache_hit": patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
        "log_session": patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
    }
    if mock_completion is not None:
        patches["openai"] = patch("app.api.v1.endpoints.story_time.client")
    return patches


@pytest.fixture(autouse=True)
def _override_student_dep():
    """Use FastAPI dependency override for get_current_student."""
    app.dependency_overrides[get_current_student] = lambda: STUDENT_PAYLOAD
    yield
    app.dependency_overrides.pop(get_current_student, None)


async def _get_story(headers=None):
    """Helper: make GET /story-time/story request."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        return await ac.get(
            "/api/v1/story-time/story",
            headers=headers or {"Authorization": "Bearer test-token"},
        )


async def _post_answer(question_id: int, selected_index: int, correct: bool):
    """Helper: make POST /story-time/answer request."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        return await ac.post(
            "/api/v1/story-time/answer",
            headers={"Authorization": "Bearer test-token"},
            json={
                "question_id": question_id,
                "selected_index": selected_index,
                "correct": correct,
            },
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 1. PER-SESSION CACHE KEY
# ═══════════════════════════════════════════════════════════════════════════════


class TestPerSessionCacheKey:
    """Verify each daily session gets a unique cache slot."""

    def test_cache_key_components_include_session_counter(self):
        """Cache key format: story_time:{classroom}:{topic}:{grade}:{session}"""
        key = make_cache_key("story_time", CLASSROOM_ID, TOPIC, str(GRADE), "0")
        parts = key.split(":")
        assert parts[0] == "story_time"
        assert parts[-1] == "0", "Last component should be session counter"

    def test_session_0_and_1_produce_different_keys(self):
        key_s0 = make_cache_key("story_time", CLASSROOM_ID, TOPIC, str(GRADE), "0")
        key_s1 = make_cache_key("story_time", CLASSROOM_ID, TOPIC, str(GRADE), "1")
        assert key_s0 != key_s1

    def test_same_session_same_classroom_produces_same_key(self):
        """Two students in the same classroom with same session count = same cache key."""
        key_a = make_cache_key("story_time", CLASSROOM_ID, TOPIC, str(GRADE), "0")
        key_b = make_cache_key("story_time", CLASSROOM_ID, TOPIC, str(GRADE), "0")
        assert key_a == key_b

    def test_different_classrooms_produce_different_keys(self):
        other_classroom = "cccccccc-0000-0000-0000-000000000002"
        key_a = make_cache_key("story_time", CLASSROOM_ID, TOPIC, str(GRADE), "0")
        key_b = make_cache_key("story_time", other_classroom, TOPIC, str(GRADE), "0")
        assert key_a != key_b

    async def test_endpoint_uses_sessions_used_in_cache_key(self):
        """When student has played 1 session, cache key ends with ':1'."""
        mock_sb = _make_supabase_mock(session_count=1)
        mock_completion = _mock_openai_completion(_make_llm_response(8))
        captured_keys = []

        async def spy_cache_get(key):
            captured_keys.append(key)
            return None

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", side_effect=spy_cache_get),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        assert resp.status_code == 200
        assert any(k.endswith(":1") for k in captured_keys), (
            f"Cache key should end with ':1' for session_count=1, got: {captured_keys}"
        )

    async def test_first_session_cache_key_ends_with_0(self):
        """First session (session_count=0) cache key ends with ':0'."""
        mock_sb = _make_supabase_mock(session_count=0)
        mock_completion = _mock_openai_completion(_make_llm_response(8))
        captured_keys = []

        async def spy_cache_get(key):
            captured_keys.append(key)
            return None

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", side_effect=spy_cache_get),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        assert resp.status_code == 200
        assert any(k.endswith(":0") for k in captured_keys), (
            f"Cache key should end with ':0' for first session, got: {captured_keys}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 2. QUESTION POOL: GENERATE 8, SERVE 3
# ═══════════════════════════════════════════════════════════════════════════════


class TestQuestionPool:
    """Verify LLM generates a pool of 8 and student sees random 3."""

    async def test_serves_exactly_3_from_pool_of_8(self):
        """LLM returns 8 questions, endpoint returns exactly 3."""
        mock_sb = _make_supabase_mock()
        mock_completion = _mock_openai_completion(_make_llm_response(8))

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["questions"]) == 3

    async def test_serves_3_when_llm_returns_5(self):
        """LLM returns fewer than 8 but >= 3 — still serves 3."""
        mock_sb = _make_supabase_mock()
        mock_completion = _mock_openai_completion(_make_llm_response(5))

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        assert resp.status_code == 200
        assert len(resp.json()["questions"]) == 3

    async def test_serves_3_when_llm_returns_exactly_3(self):
        """LLM returns exactly the minimum — all 3 are served."""
        mock_sb = _make_supabase_mock()
        mock_completion = _mock_openai_completion(_make_llm_response(3))

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        assert resp.status_code == 200
        assert len(resp.json()["questions"]) == 3

    async def test_rejects_fewer_than_3_questions(self):
        """LLM returns only 2 questions — endpoint returns 500."""
        mock_sb = _make_supabase_mock()
        mock_completion = _mock_openai_completion(_make_llm_response(2))

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        assert resp.status_code == 500

    async def test_questions_are_renumbered_1_2_3(self):
        """Sampled questions should be renumbered sequentially starting from 1."""
        mock_sb = _make_supabase_mock()
        mock_completion = _mock_openai_completion(_make_llm_response(8))

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        questions = resp.json()["questions"]
        ids = [q["id"] for q in questions]
        assert ids == [1, 2, 3], f"Question IDs should be [1, 2, 3], got {ids}"

    async def test_each_question_has_4_options_and_valid_correct_index(self):
        """Every served question must have exactly 4 options and valid correct_index."""
        mock_sb = _make_supabase_mock()
        mock_completion = _mock_openai_completion(_make_llm_response(8))

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        for q in resp.json()["questions"]:
            assert len(q["options"]) == 4, f"Question {q['id']} should have 4 options"
            assert 0 <= q["correct_index"] <= 3, f"Question {q['id']} has invalid correct_index"

    def test_random_sampling_produces_variation(self):
        """Two random.sample calls on pool of 8 almost certainly differ."""
        pool = list(range(8))
        random.seed(42)
        a = random.sample(pool, 3)
        b = random.sample(pool, 3)
        assert a != b

    async def test_served_questions_are_subset_of_pool(self):
        """The 3 served question texts must come from the 8 generated."""
        pool_data = _make_llm_response(8)
        pool_texts = {q["question"] for q in pool_data["questions"]}

        mock_sb = _make_supabase_mock()
        mock_completion = _mock_openai_completion(pool_data)

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        served_texts = {q["question"] for q in resp.json()["questions"]}
        assert served_texts.issubset(pool_texts), (
            f"Served questions must be subset of pool. Served: {served_texts}, Pool: {pool_texts}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 3. DAILY LIMIT ENFORCEMENT
# ═══════════════════════════════════════════════════════════════════════════════


class TestDailyLimit:
    """Verify students are blocked after 2 sessions per day."""

    async def test_first_session_allowed(self):
        """Session count 0 — student can play."""
        mock_sb = _make_supabase_mock(session_count=0)
        mock_completion = _mock_openai_completion(_make_llm_response(8))

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        assert resp.status_code == 200

    async def test_second_session_allowed(self):
        """Session count 1 — student can still play."""
        mock_sb = _make_supabase_mock(session_count=1)
        mock_completion = _mock_openai_completion(_make_llm_response(8))

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        assert resp.status_code == 200

    async def test_third_session_blocked(self):
        """Session count 2 (limit reached) — student gets 429."""
        mock_sb = _make_supabase_mock(session_count=2)

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
        ):
            resp = await _get_story()

        assert resp.status_code == 429
        assert "Daily limit" in resp.json()["detail"]

    async def test_daily_status_returns_correct_counts(self):
        """GET /daily-status reports correct usage."""
        mock_sb = _make_supabase_mock(session_count=1)

        with patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
                resp = await ac.get(
                    "/api/v1/story-time/daily-status",
                    headers={"Authorization": "Bearer test-token"},
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["attempts_used"] == 1
        assert data["attempts_limit"] == 2
        assert data["can_play"] is True

    async def test_daily_status_shows_cannot_play_at_limit(self):
        """GET /daily-status shows can_play=false when limit reached."""
        mock_sb = _make_supabase_mock(session_count=2)

        with patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
                resp = await ac.get(
                    "/api/v1/story-time/daily-status",
                    headers={"Authorization": "Bearer test-token"},
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["attempts_used"] == 2
        assert data["can_play"] is False


# ═══════════════════════════════════════════════════════════════════════════════
# 4. CACHE HIT BEHAVIOR
# ═══════════════════════════════════════════════════════════════════════════════


class TestCacheHit:
    """Verify cache hit returns stored data and does NOT call LLM."""

    async def test_cache_hit_returns_stored_response(self):
        """When cache has data, return it without calling LLM."""
        cached_story = {
            "story_title": "Cached Story",
            "story_text": "This was cached.",
            "topic": TOPIC,
            "week_number": 2,
            "questions": [
                {"id": 1, "question": "Cached Q1?", "options": ["A", "B", "C", "D"], "correct_index": 0},
                {"id": 2, "question": "Cached Q2?", "options": ["A", "B", "C", "D"], "correct_index": 1},
                {"id": 3, "question": "Cached Q3?", "options": ["A", "B", "C", "D"], "correct_index": 2},
            ],
        }
        mock_sb = _make_supabase_mock(session_count=0)

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=cached_story),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock()
            resp = await _get_story()

            # LLM should NOT have been called
            mock_openai.chat.completions.create.assert_not_called()

        assert resp.status_code == 200
        data = resp.json()
        assert data["story_title"] == "Cached Story"
        assert len(data["questions"]) == 3

    async def test_cache_hit_still_logs_session(self):
        """Cache hit must still log session start (for daily limit counting)."""
        cached_story = {
            "story_title": "Cached",
            "story_text": "Text.",
            "topic": TOPIC,
            "week_number": 2,
            "questions": [
                {"id": i + 1, "question": f"Q{i}?", "options": ["A", "B", "C", "D"], "correct_index": 0}
                for i in range(3)
            ],
        }
        mock_sb = _make_supabase_mock(session_count=0)
        mock_log_session = AsyncMock()

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=cached_story),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", mock_log_session),
        ):
            resp = await _get_story()

        assert resp.status_code == 200
        mock_log_session.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════════════
# 5. QUESTION VALIDATION (MALFORMED LLM OUTPUT)
# ═══════════════════════════════════════════════════════════════════════════════


class TestQuestionValidation:
    """Verify malformed LLM output is rejected gracefully."""

    async def test_rejects_question_with_3_options(self):
        """Question with only 3 options should trigger 500."""
        bad_data = _make_llm_response(4)
        bad_data["questions"][0]["options"] = ["A", "B", "C"]  # Only 3

        mock_sb = _make_supabase_mock()
        mock_completion = _mock_openai_completion(bad_data)

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        assert resp.status_code == 500

    async def test_rejects_question_with_invalid_correct_index(self):
        """correct_index of 5 should trigger 500."""
        bad_data = _make_llm_response(4)
        bad_data["questions"][0]["correct_index"] = 5

        mock_sb = _make_supabase_mock()
        mock_completion = _mock_openai_completion(bad_data)

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        assert resp.status_code == 500

    async def test_rejects_non_json_llm_response(self):
        """LLM returns plain text instead of JSON — should get 500."""
        mock_sb = _make_supabase_mock()
        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = "Sorry, I can't generate that."
        mock_completion.usage = MagicMock(prompt_tokens=10, completion_tokens=10, total_tokens=20)

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        assert resp.status_code == 500


# ═══════════════════════════════════════════════════════════════════════════════
# 6. ANSWER SUBMISSION
# ═══════════════════════════════════════════════════════════════════════════════


class TestAnswerSubmission:
    """Verify correct/incorrect answers award proper points."""

    async def test_correct_answer_awards_10_points(self):
        mock_sb = _make_supabase_mock(student_points=50)

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.update_streak", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.debounced_invalidate", new_callable=AsyncMock),
        ):
            resp = await _post_answer(question_id=1, selected_index=0, correct=True)

        assert resp.status_code == 200
        data = resp.json()
        assert data["points_awarded"] == 10
        assert data["new_total"] == 60  # 50 + 10

    async def test_wrong_answer_awards_0_points(self):
        mock_sb = _make_supabase_mock(student_points=50)

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.update_streak", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.debounced_invalidate", new_callable=AsyncMock),
        ):
            resp = await _post_answer(question_id=1, selected_index=2, correct=False)

        assert resp.status_code == 200
        data = resp.json()
        assert data["points_awarded"] == 0
        assert data["new_total"] == 50  # unchanged


# ═══════════════════════════════════════════════════════════════════════════════
# 7. RESPONSE SCHEMA
# ═══════════════════════════════════════════════════════════════════════════════


class TestResponseSchema:
    """Verify the full response has all required fields."""

    async def test_story_response_has_all_fields(self):
        mock_sb = _make_supabase_mock()
        mock_completion = _mock_openai_completion(_make_llm_response(8))

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)
            resp = await _get_story()

        assert resp.status_code == 200
        data = resp.json()
        assert "story_title" in data
        assert "story_text" in data
        assert "topic" in data
        assert "week_number" in data
        assert "questions" in data
        assert isinstance(data["story_title"], str)
        assert isinstance(data["story_text"], str)
        assert isinstance(data["topic"], str)
        assert isinstance(data["week_number"], int)
        assert isinstance(data["questions"], list)

    async def test_answer_response_has_all_fields(self):
        mock_sb = _make_supabase_mock(student_points=50)

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.update_streak", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.debounced_invalidate", new_callable=AsyncMock),
        ):
            resp = await _post_answer(question_id=1, selected_index=0, correct=True)

        data = resp.json()
        assert "points_awarded" in data
        assert "new_total" in data
        assert isinstance(data["points_awarded"], int)
        assert isinstance(data["new_total"], int)
