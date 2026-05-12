"""
Tests for Story Time question repetition fixes.

Verifies:
  - Different daily sessions produce different cache keys (no repetition).
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.cache import make_cache_key


CLASSROOM_ID = "aaaaaaaa-0000-0000-0000-000000000001"
STUDENT_ID = "bbbbbbbb-0000-0000-0000-000000000001"
TOPIC = "Animals"
GRADE = 3


def _make_student_token_payload(session_count: int = 0):
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
