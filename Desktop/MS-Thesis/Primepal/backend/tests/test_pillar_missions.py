"""
Tests for Feature 3: Pillar-based Missions Endpoint

Covers:
  - GET /api/v1/missions/pillar (endpoint integration)
  - Pillar parameter validation (reading, writing, listening, speaking)
  - Fetching current_week_topic from classroom
  - Retrieving student weaknesses from interactions table
  - Generating 10 questions with weakness focus
  - Stripping correct_answer from client response

Patching conventions:
  - Supabase:                app.api.v1.endpoints.missions.get_supabase_admin
  - Mission generator:       app.api.v1.endpoints.missions.generate_pillar_missions
  - Student auth is overridden via app.dependency_overrides[get_current_student]
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.agents.tutor_agent.mission_generator import (
    MissionQuestion,
    QuestionOption,
)

# ── Constants ─────────────────────────────────────────────────────────────────

STUDENT_ID = "dddddddd-0000-0000-0000-000000000001"
CLASSROOM_ID = "cccccccc-0000-0000-0000-000000000001"

MOCK_STUDENT = {
    "sub": STUDENT_ID,
    "classroom_id": CLASSROOM_ID,
    "role": "student",
}

MOCK_CLASSROOM_WITH_TOPIC = {
    "id": CLASSROOM_ID,
    "grade_level": 3,
    "current_week_topic": "Animals",
}

MOCK_CLASSROOM_WITHOUT_TOPIC = {
    "id": CLASSROOM_ID,
    "grade_level": 5,
    "current_week_topic": None,
}

# Mock 10 pillar questions
def _make_mock_pillar_questions():
    """Create 10 mock MissionQuestion objects."""
    questions = []
    for i in range(10):
        is_weakness_focused = i < 3
        q = MissionQuestion(
            id=i + 1,
            type="multiple_choice" if i < 7 else "fill_blank",
            question=f"Sample reading question {i + 1}",
            options=(
                [
                    QuestionOption(id="a", text="Option A"),
                    QuestionOption(id="b", text="Option B"),
                    QuestionOption(id="c", text="Option C"),
                    QuestionOption(id="d", text="Option D"),
                ]
                if i < 7
                else None
            ),
            correct_answer="a" if i < 7 else "answer",
            emoji_hint="📖",
        )
        # Add metadata as dict for testing
        questions.append({
            **q.model_dump(),
            "is_weakness_focused": is_weakness_focused,
        })
    return questions


# ── Supabase mock helpers ─────────────────────────────────────────────────────

def _make_classroom_supabase_mock(classroom_data=None):
    """
    Mock supabase_admin that returns a classroom row.
    """
    if classroom_data is None:
        classroom_data = MOCK_CLASSROOM_WITH_TOPIC

    mock_client = MagicMock()
    classroom_result = MagicMock()
    classroom_result.data = classroom_data
    (
        mock_client.table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value
    ) = classroom_result
    return mock_client


def _make_missing_classroom_mock():
    """Mock supabase_admin where classroom lookup returns None."""
    mock_client = MagicMock()
    classroom_result = MagicMock()
    classroom_result.data = None
    (
        mock_client.table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value
    ) = classroom_result
    return mock_client


def _make_supabase_with_interactions_mock(classroom_data=None, interactions_data=None):
    """
    Mock supabase_admin that handles both classrooms and interactions tables.
    """
    if classroom_data is None:
        classroom_data = MOCK_CLASSROOM_WITH_TOPIC
    if interactions_data is None:
        interactions_data = []

    mock_client = MagicMock()

    def table_side_effect(table_name):
        table_mock = MagicMock()
        if table_name == "classrooms":
            classroom_result = MagicMock()
            classroom_result.data = classroom_data
            (
                table_mock.select.return_value
                .eq.return_value
                .maybe_single.return_value
                .execute.return_value
            ) = classroom_result
        elif table_name == "interactions":
            interactions_result = MagicMock()
            interactions_result.data = interactions_data
            (
                table_mock.select.return_value
                .eq.return_value
                .eq.return_value
                .order.return_value
                .limit.return_value
                .execute.return_value
            ) = interactions_result
        return table_mock

    mock_client.table.side_effect = table_side_effect
    return mock_client


# ── TestGetPillarMissions ─────────────────────────────────────────────────────

class TestGetPillarMissions:
    """Integration tests for GET /api/v1/missions/pillar."""

    @pytest.fixture(autouse=True)
    def _override_student_auth(self):
        from app.core.security import get_current_student
        from app.main import app

        app.dependency_overrides[get_current_student] = lambda: MOCK_STUDENT
        yield
        app.dependency_overrides.clear()

    async def test_happy_path_reading_pillar(self, client: AsyncClient):
        """
        Valid pillar=reading, classroom found with current_week_topic → 200 OK.
        Returns 10 questions with weakness focus count.
        """
        mock_questions = _make_mock_pillar_questions()

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_supabase_with_interactions_mock(
                    classroom_data=MOCK_CLASSROOM_WITH_TOPIC,
                    interactions_data=[],
                ),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_pillar_missions",
                new=AsyncMock(return_value=mock_questions),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pillar"] == "reading"
        assert body["current_week_topic"] == "Animals"
        assert len(body["questions"]) == 10
        assert body["weakness_focus_questions"] == 3  # First 3 are marked as weakness_focused

    async def test_pillar_writing_returns_correct_pillar(self, client: AsyncClient):
        """Test that pillar=writing is accepted and returned correctly."""
        mock_questions = _make_mock_pillar_questions()

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_supabase_with_interactions_mock(
                    classroom_data=MOCK_CLASSROOM_WITHOUT_TOPIC,
                    interactions_data=[],
                ),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_pillar_missions",
                new=AsyncMock(return_value=mock_questions),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "writing"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pillar"] == "writing"
        assert body["current_week_topic"] is None  # Teacher hasn't set it

    async def test_pillar_listening(self, client: AsyncClient):
        """Test listening pillar is accepted."""
        mock_questions = _make_mock_pillar_questions()

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_supabase_with_interactions_mock(
                    classroom_data=MOCK_CLASSROOM_WITH_TOPIC,
                    interactions_data=[],
                ),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_pillar_missions",
                new=AsyncMock(return_value=mock_questions),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "listening"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        assert resp.json()["pillar"] == "listening"

    async def test_pillar_speaking(self, client: AsyncClient):
        """Test speaking pillar is accepted."""
        mock_questions = _make_mock_pillar_questions()

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_supabase_with_interactions_mock(
                    classroom_data=MOCK_CLASSROOM_WITH_TOPIC,
                    interactions_data=[],
                ),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_pillar_missions",
                new=AsyncMock(return_value=mock_questions),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "speaking"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        assert resp.json()["pillar"] == "speaking"

    async def test_invalid_pillar_returns_400(self, client: AsyncClient):
        """Invalid pillar value → HTTP 400 with descriptive error."""
        with patch(
            "app.api.v1.endpoints.missions.get_supabase_admin",
            return_value=_make_supabase_with_interactions_mock(),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "invalid_pillar"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 400
        assert "Invalid pillar" in resp.json()["detail"]
        assert "reading" in resp.json()["detail"]

    async def test_classroom_not_found_returns_404(self, client: AsyncClient):
        """If classroom cannot be found → HTTP 404."""
        with patch(
            "app.api.v1.endpoints.missions.get_supabase_admin",
            return_value=_make_missing_classroom_mock(),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 404
        assert "Classroom not found" in resp.json()["detail"]

    async def test_correct_answer_not_in_response(self, client: AsyncClient):
        """The questions in the response must NOT expose correct_answer."""
        mock_questions = _make_mock_pillar_questions()

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_supabase_with_interactions_mock(
                    classroom_data=MOCK_CLASSROOM_WITH_TOPIC,
                    interactions_data=[],
                ),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_pillar_missions",
                new=AsyncMock(return_value=mock_questions),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        for question in resp.json()["questions"]:
            assert "correct_answer" not in question, (
                "correct_answer must be stripped before sending to the client"
            )

    async def test_pillar_parameter_required(self, client: AsyncClient):
        """Requesting without pillar parameter → HTTP 422 (Unprocessable Entity)."""
        with patch(
            "app.api.v1.endpoints.missions.get_supabase_admin",
            return_value=_make_supabase_with_interactions_mock(),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 422  # FastAPI query parameter validation

    async def test_no_auth_returns_403(self, client: AsyncClient):
        """Request without Authorization header → HTTP 403."""
        from app.main import app

        app.dependency_overrides.clear()

        resp = await client.get(
            "/api/v1/missions/pillar",
            params={"pillar": "reading"},
        )
        assert resp.status_code == 403

    async def test_student_weaknesses_passed_to_generator(self, client: AsyncClient):
        """
        Student weaknesses from interactions table are fetched and passed to generator.
        """
        weak_interactions = [
            {
                "id": "int-1",
                "student_id": STUDENT_ID,
                "pillar": "reading",
                "score": 0.3,  # Failed
                "input_text": "The student answered incorrectly",
                "audio_transcript": None,
                "created_at": "2026-04-21T10:00:00Z",
            },
            {
                "id": "int-2",
                "student_id": STUDENT_ID,
                "pillar": "reading",
                "score": 0.5,  # Failed
                "input_text": "Another weak answer",
                "audio_transcript": None,
                "created_at": "2026-04-21T09:00:00Z",
            },
        ]
        mock_questions = _make_mock_pillar_questions()
        generator_mock = AsyncMock(return_value=mock_questions)

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_supabase_with_interactions_mock(
                    classroom_data=MOCK_CLASSROOM_WITH_TOPIC,
                    interactions_data=weak_interactions,
                ),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_pillar_missions",
                new=generator_mock,
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        # Verify generator was called with weaknesses
        generator_mock.assert_called_once()
        call_args = generator_mock.call_args
        assert call_args is not None
        assert "student_weaknesses" in call_args.kwargs
        assert len(call_args.kwargs["student_weaknesses"]) == 2
