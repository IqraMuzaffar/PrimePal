"""
Tests for Story Time question repetition fixes.

Verifies:
  - Different daily sessions produce different cache keys (no repetition).
  - Pool of 8 questions sampled to 3 produces variation.
"""
import json
import random
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.cache import make_cache_key


CLASSROOM_ID = "aaaaaaaa-0000-0000-0000-000000000001"
STUDENT_ID = "bbbbbbbb-0000-0000-0000-000000000001"
TOPIC = "Animals"
GRADE = 3


def _make_student_token_payload():
    return {
        "sub": STUDENT_ID,
        "classroom_id": CLASSROOM_ID,
        "student_name": "Ali",
    }


def _make_supabase_mock():
    """Supabase mock that returns classroom + syllabus data."""
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
            result.count = 0
            tbl.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value = result
            tbl.insert.return_value.execute.return_value = MagicMock()
        return tbl

    mock.table.side_effect = _table
    return mock


class TestStoryTimeCacheKeyIncludesSession:

    def test_session_0_and_session_1_produce_different_cache_keys(self):
        """Cache key must differ between session 0 and session 1."""
        key_s0 = make_cache_key("story_time", CLASSROOM_ID, TOPIC, str(GRADE), "0")
        key_s1 = make_cache_key("story_time", CLASSROOM_ID, TOPIC, str(GRADE), "1")
        assert key_s0 != key_s1

    async def test_endpoint_uses_session_count_in_cache_key(self):
        """
        When a student has already used 1 session today, the cache key for
        their second session must include '1', not '0'.
        """
        mock_sb = _make_supabase_mock()

        # Override session count to return 1 (student already played once)
        interactions_tbl = MagicMock()
        count_result = MagicMock()
        count_result.count = 1
        interactions_tbl.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value = count_result
        interactions_tbl.insert.return_value.execute.return_value = MagicMock()

        original_table = mock_sb.table.side_effect

        def _table_with_session(name):
            if name == "student_interactions":
                return interactions_tbl
            return original_table(name)

        mock_sb.table.side_effect = _table_with_session

        captured_keys = []

        async def spy_cache_get(key):
            captured_keys.append(key)
            return None

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.get_current_student", return_value=_make_student_token_payload()),
            patch("app.api.v1.endpoints.story_time.cache_get", side_effect=spy_cache_get),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
        ):
            from httpx import ASGITransport, AsyncClient
            from app.main import app

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
                resp = await client.get(
                    "/api/v1/story-time/story",
                    headers={"Authorization": "Bearer test-token"},
                )

            # The cache key should end with ":1" for second session
            assert any(key.endswith(":1") for key in captured_keys), (
                f"Expected cache key with session ':1', got: {captured_keys}"
            )


class TestStoryTimeQuestionPool:

    def test_pool_of_8_sampled_to_3_produces_variation(self):
        """
        Given a cached pool of 8 questions, two calls to random.sample(pool, 3)
        should (with very high probability) produce different subsets.
        """
        pool = [{"id": i, "question": f"Q{i}"} for i in range(8)]

        random.seed(42)
        sample_a = random.sample(pool, 3)
        sample_b = random.sample(pool, 3)

        assert sample_a != sample_b, "Two samples from pool of 8 should differ"

    async def test_endpoint_returns_3_questions_from_larger_pool(self):
        """
        The LLM prompt asks for 8 questions. The response should contain
        exactly 3 (sampled from the pool).
        """
        eight_questions = [
            {
                "id": i + 1,
                "question": f"What is question {i + 1}?",
                "options": ["A", "B", "C", "D"],
                "correct_index": i % 4,
            }
            for i in range(8)
        ]
        llm_response_data = {
            "story_title": "The Big Cat",
            "story_text": "A cat sat on a mat. It was a big cat.",
            "questions": eight_questions,
        }

        mock_sb = _make_supabase_mock()
        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = json.dumps(llm_response_data)
        mock_completion.usage = MagicMock(prompt_tokens=100, completion_tokens=200, total_tokens=300)

        with (
            patch("app.api.v1.endpoints.story_time.get_supabase_admin", return_value=mock_sb),
            patch("app.api.v1.endpoints.story_time.get_current_student", return_value=_make_student_token_payload()),
            patch("app.api.v1.endpoints.story_time.cache_get", new_callable=AsyncMock, return_value=None),
            patch("app.api.v1.endpoints.story_time.cache_set", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time._log_session_start", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
        ):
            mock_openai.chat.completions.create = AsyncMock(return_value=mock_completion)

            from httpx import ASGITransport, AsyncClient
            from app.main import app

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
                resp = await ac.get(
                    "/api/v1/story-time/story",
                    headers={"Authorization": "Bearer test-token"},
                )

            assert resp.status_code == 200
            data = resp.json()
            assert len(data["questions"]) == 3, f"Expected 3 questions, got {len(data['questions'])}"
