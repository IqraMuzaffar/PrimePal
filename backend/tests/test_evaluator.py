"""
Tests for Feature 9: NLP Insight Generator — Agent C

Covers:
  - GET /api/v1/evaluator/report/student/{student_id}  — student insight report (teacher only)
  - GET /api/v1/evaluator/report/classroom/{classroom_id} — classroom roster (teacher only)
  - evaluate_interactions() unit tests (LLM chain invocation)
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.agents.evaluator_agent.nlp_evaluator import StudentInsightReport

# ── Constants ────────────────────────────────────────────────────────────────

TEACHER_ID = "tttttttt-1111-0000-0000-000000000001"
OTHER_TEACHER_ID = "tttttttt-9999-0000-0000-000000000099"
CLASSROOM_ID = "cccccccc-1111-0000-0000-000000000001"
STUDENT_ID = "ssssssss-1111-0000-0000-000000000001"
STUDENT_2_ID = "ssssssss-2222-0000-0000-000000000002"

MOCK_TEACHER = {"id": TEACHER_ID}

MOCK_INSIGHT_REPORT = StudentInsightReport(
    engagement_level="High",
    mission_accuracy_pct=80,
    total_interactions=15,
    strengths=["Asks great questions"],
    areas_for_improvement=["Needs more practice with verbs"],
    recommended_topics=["Action Verbs", "Nouns"],
    teacher_note="Active and engaged learner.",
)

MOCK_STUDENT_ROW = {
    "classroom_id": CLASSROOM_ID,
    "student_name": "Ali",
}

MOCK_CLASSROOM_ROW = {
    "grade_level": 3,
    "teacher_id": TEACHER_ID,
}

MOCK_INTERACTIONS = [
    {"interaction_type": "mission_mc", "correct": True},
    {"interaction_type": "mission_mc", "correct": False},
    {"interaction_type": "chat", "correct": None},
]

# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def override_teacher_dep():
    """Bypass get_current_teacher for all tests in this module."""
    from app.main import app
    from app.core.security import get_current_teacher

    app.dependency_overrides[get_current_teacher] = lambda: MOCK_TEACHER
    yield
    app.dependency_overrides.pop(get_current_teacher, None)


# ── TestStudentReport ─────────────────────────────────────────────────────────


class TestStudentReport:

    def _make_supabase_mock(self, teacher_id=TEACHER_ID, student_data=MOCK_STUDENT_ROW):
        """Build a Supabase admin mock for the student_report endpoint."""
        mock_admin = MagicMock()

        def _table(name):
            tbl = MagicMock()
            if name == "students":
                r = MagicMock()
                r.data = student_data
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "classrooms":
                r = MagicMock()
                r.data = {"grade_level": 3, "teacher_id": teacher_id}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            return tbl

        mock_admin.table.side_effect = _table
        return mock_admin

    async def test_student_report_happy_path(self, client: AsyncClient):
        """Valid teacher + student → 200 + StudentInsightReport fields present."""
        mock_admin = self._make_supabase_mock()

        with patch(
            "app.api.v1.endpoints.evaluator.get_supabase_admin",
            return_value=mock_admin,
        ), patch(
            "app.api.v1.endpoints.evaluator.evaluate_interactions",
            new=AsyncMock(return_value=MOCK_INSIGHT_REPORT),
        ):
            resp = await client.get(f"/api/v1/evaluator/report/student/{STUDENT_ID}")

        assert resp.status_code == 200
        body = resp.json()
        assert body["engagement_level"] == "High"
        assert body["mission_accuracy_pct"] == 80
        assert body["total_interactions"] == 15
        assert isinstance(body["strengths"], list)
        assert isinstance(body["areas_for_improvement"], list)
        assert isinstance(body["recommended_topics"], list)
        assert "teacher_note" in body

    async def test_student_report_wrong_teacher_403(self, client: AsyncClient):
        """Teacher doesn't own the classroom → 403."""
        mock_admin = self._make_supabase_mock(teacher_id=OTHER_TEACHER_ID)

        with patch(
            "app.api.v1.endpoints.evaluator.get_supabase_admin",
            return_value=mock_admin,
        ):
            resp = await client.get(f"/api/v1/evaluator/report/student/{STUDENT_ID}")

        assert resp.status_code == 403

    async def test_student_report_student_not_found_404(self, client: AsyncClient):
        """Student_id doesn't exist → 404."""
        mock_admin = MagicMock()

        def _table(name):
            tbl = MagicMock()
            if name == "students":
                r = MagicMock()
                r.data = None
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            return tbl

        mock_admin.table.side_effect = _table

        with patch(
            "app.api.v1.endpoints.evaluator.get_supabase_admin",
            return_value=mock_admin,
        ):
            resp = await client.get("/api/v1/evaluator/report/student/nonexistent-uuid")

        assert resp.status_code == 404

    async def test_student_report_no_auth_403(self, client: AsyncClient):
        """No teacher token → 403 (HTTPBearer raises 403 when credentials absent)."""
        from app.main import app
        from app.core.security import get_current_teacher

        # Remove the override for this test
        app.dependency_overrides.pop(get_current_teacher, None)

        resp = await client.get(f"/api/v1/evaluator/report/student/{STUDENT_ID}")
        assert resp.status_code == 403

        # Restore for autouse teardown
        app.dependency_overrides[get_current_teacher] = lambda: MOCK_TEACHER


# ── TestClassroomReport ───────────────────────────────────────────────────────


class TestClassroomReport:

    def _make_classroom_mock(self, teacher_id=TEACHER_ID, students=None, interactions=None):
        """Build a Supabase admin mock for the classroom_report endpoint."""
        if students is None:
            students = [
                {"id": STUDENT_ID, "student_name": "Ali", "avatar_url": "/avatars/tiger.png"},
                {"id": STUDENT_2_ID, "student_name": "Sara", "avatar_url": "/avatars/owl.png"},
            ]
        if interactions is None:
            interactions = MOCK_INTERACTIONS

        mock_admin = MagicMock()
        call_count = {"n": 0}

        def _table(name):
            tbl = MagicMock()
            if name == "classrooms":
                r = MagicMock()
                r.data = {"grade_level": 3, "teacher_id": teacher_id}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "students":
                r = MagicMock()
                r.data = students
                tbl.select.return_value.eq.return_value.execute.return_value = r
            elif name == "student_interactions":
                r = MagicMock()
                r.data = interactions
                tbl.select.return_value.eq.return_value.execute.return_value = r
            return tbl

        mock_admin.table.side_effect = _table
        return mock_admin

    async def test_classroom_report_happy_path(self, client: AsyncClient):
        """Returns roster with student summaries."""
        mock_admin = self._make_classroom_mock()

        with patch(
            "app.api.v1.endpoints.evaluator.get_supabase_admin",
            return_value=mock_admin,
        ):
            resp = await client.get(f"/api/v1/evaluator/report/classroom/{CLASSROOM_ID}")

        assert resp.status_code == 200
        body = resp.json()
        assert body["classroom_id"] == CLASSROOM_ID
        assert body["grade_level"] == 3
        assert len(body["students"]) == 2
        # Verify each student summary has required fields
        for s in body["students"]:
            assert "student_id" in s
            assert "student_name" in s
            assert "total_interactions" in s
            assert "mission_accuracy_pct" in s

    async def test_classroom_report_wrong_teacher_403(self, client: AsyncClient):
        """Teacher doesn't own the classroom → 403."""
        mock_admin = self._make_classroom_mock(teacher_id=OTHER_TEACHER_ID)

        with patch(
            "app.api.v1.endpoints.evaluator.get_supabase_admin",
            return_value=mock_admin,
        ):
            resp = await client.get(f"/api/v1/evaluator/report/classroom/{CLASSROOM_ID}")

        assert resp.status_code == 403

    async def test_classroom_report_empty_classroom(self, client: AsyncClient):
        """Classroom with no students returns empty list."""
        mock_admin = self._make_classroom_mock(students=[], interactions=[])

        with patch(
            "app.api.v1.endpoints.evaluator.get_supabase_admin",
            return_value=mock_admin,
        ):
            resp = await client.get(f"/api/v1/evaluator/report/classroom/{CLASSROOM_ID}")

        assert resp.status_code == 200
        body = resp.json()
        assert body["students"] == []


# ── TestEvaluateInteractions (unit) ──────────────────────────────────────────


class TestEvaluateInteractions:

    def _make_supabase_with_interactions(self, rows):
        """Build a minimal Supabase mock that returns `rows` from student_interactions."""
        mock_client = MagicMock()
        r = MagicMock()
        r.data = rows
        (
            mock_client.table.return_value
            .select.return_value
            .eq.return_value
            .order.return_value
            .limit.return_value
            .execute.return_value
        ) = r
        return mock_client

    async def test_evaluate_interactions_calls_llm_with_stats(self):
        """Verify the chain is invoked with correct stat values."""
        from app.agents.evaluator_agent.nlp_evaluator import evaluate_interactions

        rows = [
            {"interaction_type": "mission_mc", "correct": True, "context_used": False, "original_message": None},
            {"interaction_type": "mission_mc", "correct": True, "context_used": False, "original_message": None},
            {"interaction_type": "mission_fill", "correct": False, "context_used": False, "original_message": None},
            {"interaction_type": "chat", "correct": None, "context_used": True, "original_message": "Hello teacher"},
            {"interaction_type": "chat", "correct": None, "context_used": False, "original_message": "Mujhe help chahiye"},
        ]
        mock_supabase = self._make_supabase_with_interactions(rows)

        # Patch the entire chain at the prompt level: capture what ainvoke is called with
        captured_inputs = {}

        async def fake_chain_ainvoke(inputs):
            captured_inputs.update(inputs)
            return MOCK_INSIGHT_REPORT

        mock_chain = MagicMock()
        mock_chain.ainvoke = fake_chain_ainvoke

        mock_llm_instance = MagicMock()
        mock_llm_instance.with_structured_output.return_value = mock_llm_instance

        mock_chat_openai = MagicMock(return_value=mock_llm_instance)

        with patch("app.agents.evaluator_agent.nlp_evaluator.ChatOpenAI", mock_chat_openai), \
             patch("app.agents.evaluator_agent.nlp_evaluator._PROMPT") as mock_prompt:
            mock_prompt.__or__ = MagicMock(return_value=mock_chain)

            result = await evaluate_interactions(
                student_id=STUDENT_ID,
                grade_level=3,
                supabase_admin_client=mock_supabase,
            )

        # Verify the stat values that were computed and passed to the chain
        assert captured_inputs["total_interactions"] == 5
        assert captured_inputs["mission_count"] == 3
        assert captured_inputs["correct_count"] == 2
        assert captured_inputs["chat_count"] == 2
        assert captured_inputs["context_used_count"] == 1
        assert result == MOCK_INSIGHT_REPORT

    async def test_evaluate_interactions_handles_empty_interactions(self):
        """No rows in DB → LLM still called with zeros."""
        from app.agents.evaluator_agent.nlp_evaluator import evaluate_interactions

        mock_supabase = self._make_supabase_with_interactions([])

        captured_inputs = {}

        async def fake_chain_ainvoke(inputs):
            captured_inputs.update(inputs)
            return MOCK_INSIGHT_REPORT

        mock_chain = MagicMock()
        mock_chain.ainvoke = fake_chain_ainvoke

        mock_llm_instance = MagicMock()
        mock_llm_instance.with_structured_output.return_value = mock_llm_instance

        mock_chat_openai = MagicMock(return_value=mock_llm_instance)

        with patch("app.agents.evaluator_agent.nlp_evaluator.ChatOpenAI", mock_chat_openai), \
             patch("app.agents.evaluator_agent.nlp_evaluator._PROMPT") as mock_prompt:
            mock_prompt.__or__ = MagicMock(return_value=mock_chain)

            result = await evaluate_interactions(
                student_id=STUDENT_ID,
                grade_level=2,
                supabase_admin_client=mock_supabase,
            )

        assert captured_inputs["total_interactions"] == 0
        assert captured_inputs["mission_count"] == 0
        assert captured_inputs["correct_count"] == 0
        assert captured_inputs["chat_count"] == 0
        assert captured_inputs["context_used_count"] == 0
        assert captured_inputs["chat_samples"] == "(no chat messages yet)"
        assert result == MOCK_INSIGHT_REPORT
