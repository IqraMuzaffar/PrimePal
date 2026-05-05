"""
Tests for pre-generation utility module.

Covers:
  - All four pillars are generated when no cache exists
  - Pillars with existing cache are skipped
  - No generation when active topics list is empty
  - One pillar failure does not block others
  - Topic update endpoint triggers pre-generation as a background task

Patching conventions:
  - Supabase:            app.utils.pregenerate_missions.get_supabase_admin
  - Mission generator:   app.utils.pregenerate_missions.generate_pillar_missions
  - Active topics:       app.utils.pregenerate_missions.get_active_topics
  - Cache get:           app.utils.pregenerate_missions.cache_get
  - Cache set:           app.utils.pregenerate_missions.cache_set
  - Classroom supabase:  app.api.v1.endpoints.classroom.get_supabase_admin
  - Classroom pregen:    app.api.v1.endpoints.classroom.pregenerate_pillar_missions
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.agents.tutor_agent.mission_generator import MissionQuestion, QuestionOption
from app.utils.pregenerate_missions import pregenerate_pillar_missions


# ── Constants ────────────────────────────────────────────────────────────────

CLASSROOM_ID = "cccccccc-0000-0000-0000-000000000001"
GRADE_LEVEL = 3
PILLARS = ["reading", "writing", "listening", "speaking"]

MOCK_ACTIVE_TOPICS = [
    {"id": "t1", "name": "Animals"},
    {"id": "t2", "name": "Colors"},
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_mock_questions(pillar: str) -> list[dict]:
    """Create 10 mock MissionQuestion dicts for a given pillar."""
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


def _make_classroom_supabase_mock(grade_level: int = GRADE_LEVEL):
    """Mock supabase admin that returns a classroom row with the given grade_level."""
    mock_client = MagicMock()
    classroom_result = MagicMock()
    classroom_result.data = {"id": CLASSROOM_ID, "grade_level": grade_level}
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
    """Unit tests for pregenerate_pillar_missions utility."""

    @pytest.mark.asyncio
    async def test_generates_all_four_pillars(self):
        """Verifies generate_pillar_missions is called once per pillar (4 times)."""
        mock_supabase = _make_classroom_supabase_mock()
        mock_generator = AsyncMock(side_effect=lambda **kw: _make_mock_questions(kw["pillar"]))

        with (
            patch("app.utils.pregenerate_missions.get_supabase_admin", return_value=mock_supabase),
            patch("app.utils.pregenerate_missions.get_active_topics", new_callable=AsyncMock, return_value=MOCK_ACTIVE_TOPICS),
            patch("app.utils.pregenerate_missions.generate_pillar_missions", new=mock_generator),
            patch("app.utils.pregenerate_missions.cache_get", new=AsyncMock(return_value=None)),
            patch("app.utils.pregenerate_missions.cache_set", new=AsyncMock(return_value=True)),
        ):
            await pregenerate_pillar_missions(CLASSROOM_ID)

        assert mock_generator.call_count == 4
        called_pillars = sorted(call.kwargs["pillar"] for call in mock_generator.call_args_list)
        assert called_pillars == sorted(PILLARS)

    @pytest.mark.asyncio
    async def test_skips_pillar_when_cache_exists(self):
        """Verifies pillars with existing cache are skipped (no LLM call)."""
        mock_supabase = _make_classroom_supabase_mock()
        mock_generator = AsyncMock(side_effect=lambda **kw: _make_mock_questions(kw["pillar"]))

        # cache_get returns data for reading and writing, None for listening and speaking
        async def selective_cache_get(key: str):
            if "reading" in key or "writing" in key:
                return {"pillar": "cached", "questions": []}
            return None

        with (
            patch("app.utils.pregenerate_missions.get_supabase_admin", return_value=mock_supabase),
            patch("app.utils.pregenerate_missions.get_active_topics", new_callable=AsyncMock, return_value=MOCK_ACTIVE_TOPICS),
            patch("app.utils.pregenerate_missions.generate_pillar_missions", new=mock_generator),
            patch("app.utils.pregenerate_missions.cache_get", new=AsyncMock(side_effect=selective_cache_get)),
            patch("app.utils.pregenerate_missions.cache_set", new=AsyncMock(return_value=True)),
        ):
            await pregenerate_pillar_missions(CLASSROOM_ID)

        assert mock_generator.call_count == 2
        called_pillars = sorted(call.kwargs["pillar"] for call in mock_generator.call_args_list)
        assert called_pillars == ["listening", "speaking"]

    @pytest.mark.asyncio
    async def test_skips_when_no_active_topics(self):
        """Verifies no generation when the active topics list is empty."""
        mock_supabase = _make_classroom_supabase_mock()
        mock_generator = AsyncMock()

        with (
            patch("app.utils.pregenerate_missions.get_supabase_admin", return_value=mock_supabase),
            patch("app.utils.pregenerate_missions.get_active_topics", new_callable=AsyncMock, return_value=[]),
            patch("app.utils.pregenerate_missions.generate_pillar_missions", new=mock_generator),
            patch("app.utils.pregenerate_missions.cache_get", new=AsyncMock(return_value=None)),
            patch("app.utils.pregenerate_missions.cache_set", new=AsyncMock(return_value=True)),
        ):
            await pregenerate_pillar_missions(CLASSROOM_ID)

        mock_generator.assert_not_called()

    @pytest.mark.asyncio
    async def test_one_pillar_failure_does_not_block_others(self):
        """Verifies other pillars still cache if one pillar fails."""
        mock_supabase = _make_classroom_supabase_mock()
        mock_cache_set = AsyncMock(return_value=True)

        async def generator_with_failure(**kwargs):
            if kwargs["pillar"] == "writing":
                raise RuntimeError("LLM exploded for writing")
            return _make_mock_questions(kwargs["pillar"])

        mock_generator = AsyncMock(side_effect=generator_with_failure)

        with (
            patch("app.utils.pregenerate_missions.get_supabase_admin", return_value=mock_supabase),
            patch("app.utils.pregenerate_missions.get_active_topics", new_callable=AsyncMock, return_value=MOCK_ACTIVE_TOPICS),
            patch("app.utils.pregenerate_missions.generate_pillar_missions", new=mock_generator),
            patch("app.utils.pregenerate_missions.cache_get", new=AsyncMock(return_value=None)),
            patch("app.utils.pregenerate_missions.cache_set", new=mock_cache_set),
        ):
            await pregenerate_pillar_missions(CLASSROOM_ID)

        # Generator called for all 4 pillars
        assert mock_generator.call_count == 4
        # Cache set called for 3 pillars (writing failed)
        assert mock_cache_set.call_count == 3
        cached_pillars = []
        for call in mock_cache_set.call_args_list:
            key = call.args[0] if call.args else call.kwargs.get("key", "")
            cached_pillars.append(key)
        # None of the cached keys should contain "writing"
        assert all("writing" not in k for k in cached_pillars)


# ── Integration: Topic Update Triggers Pre-generation ───────────────────────

MOCK_TEACHER = {
    "id": "tttttttt-0000-0000-0000-000000000001",
    "email": "teacher@test.com",
    "is_admin": False,
}


class TestTopicUpdateTriggersPregen:
    """Verify PUT /{classroom_id}/active-topics fires pregenerate_pillar_missions."""

    @pytest.mark.asyncio
    async def test_topic_update_fires_pregenerate(self):
        """PUT active-topics should schedule pregenerate_pillar_missions as a background task."""
        from httpx import ASGITransport, AsyncClient
        from app.main import app
        from app.core.security import get_current_teacher

        # Override teacher auth
        app.dependency_overrides[get_current_teacher] = lambda: MOCK_TEACHER

        # Mock supabase admin for the delete/insert chain in save_active_topics
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock()
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()

        mock_pregen = AsyncMock()

        try:
            with (
                patch(
                    "app.api.v1.endpoints.classroom.get_supabase_admin",
                    return_value=mock_supabase,
                ),
                patch(
                    "app.utils.pregenerate_missions.pregenerate_pillar_missions",
                    new=mock_pregen,
                ),
            ):
                async with AsyncClient(
                    transport=ASGITransport(app=app), base_url="http://test"
                ) as client:
                    resp = await client.put(
                        f"/api/v1/classroom/{CLASSROOM_ID}/active-topics",
                        json={"topic_ids": [1, 2, 3]},
                    )

                assert resp.status_code == 200
                assert resp.json()["active_count"] == 3
                mock_pregen.assert_awaited_once_with(CLASSROOM_ID)
        finally:
            app.dependency_overrides.pop(get_current_teacher, None)
