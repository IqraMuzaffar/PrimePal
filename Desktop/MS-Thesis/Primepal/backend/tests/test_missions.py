"""
Tests for Feature 6: Gamified Missions

Covers:
  - GET  /api/v1/missions/daily    (endpoint integration)
  - POST /api/v1/missions/complete (endpoint integration)
  - GET  /api/v1/missions/me       (endpoint integration)
  - Grade guardrail: Grade 3 student always gets Grade 3 filter
  - generate_daily_missions()      (unit — mocked LLM chain)

Patching conventions (consistent with test_chat.py):
  - Supabase:          app.api.v1.endpoints.missions.get_supabase_admin
  - Mission generator: app.api.v1.endpoints.missions.generate_daily_missions
  - Retrieval:         app.api.v1.endpoints.missions.retrieve_grade_filtered_chunks
  - Student auth is overridden via app.dependency_overrides[get_current_student]
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.agents.tutor_agent.mission_generator import (
    DailyMissions,
    MissionQuestion,
    QuestionOption,
)

# ── Constants ─────────────────────────────────────────────────────────────────

STUDENT_ID   = "dddddddd-0000-0000-0000-000000000001"
CLASSROOM_ID = "cccccccc-0000-0000-0000-000000000001"

MOCK_STUDENT = {
    "sub": STUDENT_ID,
    "classroom_id": CLASSROOM_ID,
    "role": "student",
}

MOCK_MISSIONS = DailyMissions(
    topic="Animals",
    questions=[
        MissionQuestion(
            id=1,
            type="multiple_choice",
            question="Which is an animal?",
            options=[
                QuestionOption(id="a", text="Cat"),
                QuestionOption(id="b", text="Book"),
                QuestionOption(id="c", text="Chair"),
                QuestionOption(id="d", text="Door"),
            ],
            correct_answer="a",
            emoji_hint="🐱",
        ),
        MissionQuestion(
            id=2,
            type="multiple_choice",
            question="What does 'big' mean?",
            options=[
                QuestionOption(id="a", text="Small"),
                QuestionOption(id="b", text="Large"),
                QuestionOption(id="c", text="Fast"),
                QuestionOption(id="d", text="Slow"),
            ],
            correct_answer="b",
            emoji_hint="🐘",
        ),
        MissionQuestion(
            id=3,
            type="fill_blank",
            question="The ___ is sleeping.",
            options=None,
            correct_answer="cat",
            emoji_hint="😴",
        ),
    ],
)

FAKE_CHUNKS = [
    "The cat sat on the mat. It is a big cat.",
    "Look at the red ball. The ball is round.",
]


# ── Supabase mock helpers ─────────────────────────────────────────────────────

def _make_classroom_supabase_mock(grade_level: int):
    """
    Mock supabase_admin that returns a classroom row with the given grade_level.
    Simulates: .table("classrooms").select(...).eq(...).maybe_single().execute()
    """
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


def _make_missing_classroom_mock():
    """Mock supabase_admin where classroom lookup returns None (no data)."""
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


def _make_student_supabase_mock(points: int = 20, grade_level: int = 3):
    """
    Mock supabase_admin that returns a student row for complete/me endpoints.
    Handles both .select("points") and .select("student_name, avatar_url, points") chains
    as well as .update(...) chains on the "students" table, and also the classrooms
    grade_level lookup added by Feature 8.
    """
    mock_client = MagicMock()

    def table_side_effect(table_name):
        table_mock = MagicMock()
        if table_name == "students":
            student_result = MagicMock()
            student_result.data = {
                "points": points,
                "student_name": "Ali",
                "avatar_url": "https://example.com/avatar.png",
            }
            (
                table_mock.select.return_value
                .eq.return_value
                .maybe_single.return_value
                .execute.return_value
            ) = student_result
            table_mock.update.return_value.eq.return_value.execute.return_value = MagicMock()
        elif table_name == "classrooms":
            classroom_result = MagicMock()
            classroom_result.data = {"grade_level": grade_level}
            (
                table_mock.select.return_value
                .eq.return_value
                .maybe_single.return_value
                .execute.return_value
            ) = classroom_result
        return table_mock

    mock_client.table.side_effect = table_side_effect
    return mock_client


def _make_missing_student_mock():
    """Mock supabase_admin where student lookup returns None (no data)."""
    mock_client = MagicMock()
    student_result = MagicMock()
    student_result.data = None
    (
        mock_client.table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value
    ) = student_result
    return mock_client


# ── TestGetDailyMissions ──────────────────────────────────────────────────────

class TestGetDailyMissions:
    """Integration tests for GET /api/v1/missions/daily."""

    @pytest.fixture(autouse=True)
    def _override_student_auth(self):
        from app.core.security import get_current_student
        from app.main import app

        app.dependency_overrides[get_current_student] = lambda: MOCK_STUDENT
        yield
        app.dependency_overrides.clear()

    async def test_happy_path_returns_questions(self, client: AsyncClient):
        """Classroom grade 3, 2 chunks retrieved, generator returns 3 questions → 200."""
        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.missions.retrieve_grade_filtered_chunks",
                new=AsyncMock(return_value=FAKE_CHUNKS),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_daily_missions",
                new=AsyncMock(return_value=MOCK_MISSIONS),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/daily",
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["grade_level"] == 3
        assert body["topic"] == "Animals"
        assert len(body["questions"]) == 3

    async def test_correct_answer_not_in_response(self, client: AsyncClient):
        """The questions in the /daily response must NOT expose correct_answer."""
        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.missions.retrieve_grade_filtered_chunks",
                new=AsyncMock(return_value=FAKE_CHUNKS),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_daily_missions",
                new=AsyncMock(return_value=MOCK_MISSIONS),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/daily",
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        for question in resp.json()["questions"]:
            assert "correct_answer" not in question, (
                "correct_answer must be stripped before sending to the client"
            )

    async def test_context_used_when_chunks_exist(self, client: AsyncClient):
        """retrieve_grade_filtered_chunks must be called with grade_level=3."""
        retrieval_mock = AsyncMock(return_value=FAKE_CHUNKS)

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.missions.retrieve_grade_filtered_chunks",
                new=retrieval_mock,
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_daily_missions",
                new=AsyncMock(return_value=MOCK_MISSIONS),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/daily",
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        retrieval_mock.assert_called_once()
        _, kwargs = retrieval_mock.call_args
        assert kwargs["grade_level"] == 3

    async def test_grade_guardrail_classroom_not_found(self, client: AsyncClient):
        """If the classroom from the JWT cannot be found → HTTP 404."""
        with patch(
            "app.api.v1.endpoints.missions.get_supabase_admin",
            return_value=_make_missing_classroom_mock(),
        ):
            resp = await client.get(
                "/api/v1/missions/daily",
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 404
        assert "Classroom not found" in resp.json()["detail"]

    async def test_no_auth_returns_403(self, client: AsyncClient):
        """Request without Authorization header must be rejected with HTTP 403."""
        from app.main import app
        app.dependency_overrides.clear()  # remove the student override

        resp = await client.get("/api/v1/missions/daily")
        assert resp.status_code == 403


# ── TestPostCompleteMission ───────────────────────────────────────────────────

class TestPostCompleteMission:
    """Integration tests for POST /api/v1/missions/complete."""

    @pytest.fixture(autouse=True)
    def _override_student_auth(self):
        from app.core.security import get_current_student
        from app.main import app

        app.dependency_overrides[get_current_student] = lambda: MOCK_STUDENT
        yield
        app.dependency_overrides.clear()

    async def test_correct_answer_awards_10_points(self, client: AsyncClient):
        """Student has 20 points, question_correct=True → points_awarded=10, new_total=30."""
        with patch(
            "app.api.v1.endpoints.missions.get_supabase_admin",
            return_value=_make_student_supabase_mock(points=20),
        ):
            resp = await client.post(
                "/api/v1/missions/complete",
                json={"question_correct": True},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["points_awarded"] == 10
        assert body["new_total"] == 30

    async def test_wrong_answer_awards_0_points(self, client: AsyncClient):
        """Student has 20 points, question_correct=False → points_awarded=0, new_total=20."""
        with patch(
            "app.api.v1.endpoints.missions.get_supabase_admin",
            return_value=_make_student_supabase_mock(points=20),
        ):
            resp = await client.post(
                "/api/v1/missions/complete",
                json={"question_correct": False},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["points_awarded"] == 0
        assert body["new_total"] == 20

    async def test_complete_student_not_found(self, client: AsyncClient):
        """Student lookup returns None → HTTP 404."""
        with patch(
            "app.api.v1.endpoints.missions.get_supabase_admin",
            return_value=_make_missing_student_mock(),
        ):
            resp = await client.post(
                "/api/v1/missions/complete",
                json={"question_correct": True},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 404
        assert "Student record not found" in resp.json()["detail"]


# ── TestGetStudentProfile ─────────────────────────────────────────────────────

class TestGetStudentProfile:
    """Integration tests for GET /api/v1/missions/me."""

    @pytest.fixture(autouse=True)
    def _override_student_auth(self):
        from app.core.security import get_current_student
        from app.main import app

        app.dependency_overrides[get_current_student] = lambda: MOCK_STUDENT
        yield
        app.dependency_overrides.clear()

    async def test_me_returns_student_profile(self, client: AsyncClient):
        """Student has name 'Ali', avatar_url 'https://...', points=50 → 200 with correct data."""
        mock_client = MagicMock()
        student_result = MagicMock()
        student_result.data = {
            "student_name": "Ali",
            "avatar_url": "https://example.com/avatar.png",
            "points": 50,
        }
        (
            mock_client.table.return_value
            .select.return_value
            .eq.return_value
            .maybe_single.return_value
            .execute.return_value
        ) = student_result

        with patch(
            "app.api.v1.endpoints.missions.get_supabase_admin",
            return_value=mock_client,
        ):
            resp = await client.get(
                "/api/v1/missions/me",
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["student_name"] == "Ali"
        assert body["avatar_url"] == "https://example.com/avatar.png"
        assert body["points"] == 50
        assert body["student_id"] == STUDENT_ID

    async def test_me_student_not_found(self, client: AsyncClient):
        """Student lookup returns None → HTTP 404."""
        with patch(
            "app.api.v1.endpoints.missions.get_supabase_admin",
            return_value=_make_missing_student_mock(),
        ):
            resp = await client.get(
                "/api/v1/missions/me",
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 404
        assert "Student record not found" in resp.json()["detail"]

    async def test_me_includes_customization_fields(self, client: AsyncClient):
        """GET /missions/me returns avatar_style and theme_color."""
        mock_sb = MagicMock()
        mock_result = MagicMock()
        mock_result.data = {
            "student_name": "Ali",
            "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=Ali",
            "avatar_style": "bottts",
            "theme_color": "#8b5cf6",
            "points": 50,
        }
        (mock_sb.table.return_value.select.return_value
         .eq.return_value.maybe_single.return_value.execute.return_value) = mock_result

        with patch("app.api.v1.endpoints.missions.get_supabase_admin", return_value=mock_sb):
            resp = await client.get(
                "/api/v1/missions/me",
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["avatar_style"] == "bottts"
        assert data["theme_color"] == "#8b5cf6"


# ── TestGradeLevelGuardrail ───────────────────────────────────────────────────

class TestGradeLevelGuardrail:
    """
    THE CRITICAL TEST — verify that grade_level comes from the classroom DB record,
    not from any client-supplied value.
    """

    @pytest.fixture(autouse=True)
    def _override_student_auth(self):
        from app.core.security import get_current_student
        from app.main import app

        app.dependency_overrides[get_current_student] = lambda: MOCK_STUDENT
        yield
        app.dependency_overrides.clear()

    async def test_grade3_student_gets_grade3_missions(self, client: AsyncClient):
        """
        CRITICAL: Classroom record returns grade_level=3.
        retrieve_grade_filtered_chunks must be called with grade_level=3.

        This mirrors the exact guardrail test in test_chat.py and proves the
        server enforces grade from DB — the client cannot override it.
        """
        retrieval_mock = AsyncMock(return_value=FAKE_CHUNKS)

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.missions.retrieve_grade_filtered_chunks",
                new=retrieval_mock,
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_daily_missions",
                new=AsyncMock(return_value=MOCK_MISSIONS),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/daily",
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200

        # THE GUARDRAIL ASSERTION: retrieval was called with grade_level=3
        retrieval_mock.assert_called_once()
        _, kwargs = retrieval_mock.call_args
        assert kwargs["grade_level"] == 3, (
            f"Expected grade_level=3 but retrieval was called with "
            f"grade_level={kwargs.get('grade_level')}. "
            f"The guardrail is broken — wrong-grade content could reach the student."
        )


# ── TestGenerateDailyMissions — unit tests ────────────────────────────────────

class TestGenerateDailyMissions:
    """Unit tests for generate_daily_missions() — LLM chain is fully mocked."""

    async def test_generate_calls_llm_with_context(self):
        """When context_chunks is non-empty, the LLM chain is invoked once."""
        mock_chain = MagicMock()
        mock_chain.ainvoke = AsyncMock(return_value=MOCK_MISSIONS)

        with patch("app.agents.tutor_agent.mission_generator.ChatOpenAI") as mock_llm_cls:
            mock_llm_instance = MagicMock()
            mock_llm_cls.return_value.with_structured_output.return_value = mock_llm_instance

            with patch(
                "app.agents.tutor_agent.mission_generator._PROMPT_WITH_CONTEXT"
            ) as mock_prompt:
                mock_prompt.__or__ = MagicMock(return_value=mock_chain)

                from app.agents.tutor_agent.mission_generator import generate_daily_missions

                result = await generate_daily_missions(
                    grade_level=3,
                    context_chunks=FAKE_CHUNKS,
                )

        mock_chain.ainvoke.assert_called_once()
        invoke_payload = mock_chain.ainvoke.call_args[0][0]
        assert invoke_payload["grade_level"] == 3
        assert "cat" in invoke_payload["context"].lower()

    async def test_generate_handles_empty_chunks_gracefully(self):
        """Empty context_chunks list → fallback prompt runs without raising an exception."""
        mock_chain = MagicMock()
        mock_chain.ainvoke = AsyncMock(return_value=MOCK_MISSIONS)

        with patch("app.agents.tutor_agent.mission_generator.ChatOpenAI") as mock_llm_cls:
            mock_llm_instance = MagicMock()
            mock_llm_cls.return_value.with_structured_output.return_value = mock_llm_instance

            with patch(
                "app.agents.tutor_agent.mission_generator._PROMPT_FALLBACK"
            ) as mock_prompt_fallback:
                mock_prompt_fallback.__or__ = MagicMock(return_value=mock_chain)

                from app.agents.tutor_agent.mission_generator import generate_daily_missions

                result = await generate_daily_missions(
                    grade_level=3,
                    context_chunks=[],   # empty → fallback path
                )

        # The fallback chain must have been invoked once with just grade_level
        mock_chain.ainvoke.assert_called_once()
        invoke_payload = mock_chain.ainvoke.call_args[0][0]
        assert invoke_payload["grade_level"] == 3
