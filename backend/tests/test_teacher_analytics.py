# backend/tests/test_teacher_analytics.py
"""Tests for GET /evaluator/report/teacher"""
import pytest
from unittest.mock import MagicMock, patch
from httpx import AsyncClient

TEACHER = {"id": "teacher-uuid-123"}

CLASSROOMS = [
    {"id": "cls-1", "class_name": "3A", "grade_level": 3, "teacher_id": "teacher-uuid-123"},
    {"id": "cls-2", "class_name": "4B", "grade_level": 4, "teacher_id": "teacher-uuid-123"},
]

INTERACTIONS = [
    {"student_id": "stu-1", "is_correct": True},
    {"student_id": "stu-1", "is_correct": True},
    {"student_id": "stu-1", "is_correct": False},
    {"student_id": "stu-2", "is_correct": True},
]

STUDENTS = [
    {"id": "stu-1", "student_name": "Ali", "avatar_url": "https://example.com/a.svg", "classroom_id": "cls-1"},
    {"id": "stu-2", "student_name": "Sara", "avatar_url": "https://example.com/b.svg", "classroom_id": "cls-1"},
]


def mock_supabase():
    """Create a mock Supabase client with chained method calls properly configured."""
    sb = MagicMock()

    # Mock classrooms query
    classrooms_mock = MagicMock()
    classrooms_mock.select().eq().execute.return_value = MagicMock(data=CLASSROOMS)
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=CLASSROOMS)

    # We need to handle different table names and method chains
    def table_side_effect(table_name):
        table_mock = MagicMock()
        if table_name == "classrooms":
            table_mock.select.return_value.eq.return_value.execute.return_value = MagicMock(data=CLASSROOMS)
        elif table_name == "students":
            table_mock.select.return_value.in_.return_value.execute.return_value = MagicMock(data=STUDENTS)
        elif table_name == "student_interactions":
            table_mock.select.return_value.in_.return_value.execute.return_value = MagicMock(data=INTERACTIONS)
        return table_mock

    sb.table.side_effect = table_side_effect
    return sb


class TestTeacherAnalytics:
    """Teacher analytics endpoint tests — auth is overridden for all tests in this class."""

    @pytest.fixture(autouse=True)
    def _override_teacher_auth(self):
        from app.core.security import get_current_teacher
        from app.main import app

        app.dependency_overrides[get_current_teacher] = lambda: TEACHER
        yield
        app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_teacher_analytics_returns_all_classrooms(self, client: AsyncClient, auth_headers):
        """GET /evaluator/report/teacher returns classrooms grouped with student stats."""
        with patch("app.api.v1.endpoints.evaluator.get_supabase_admin", return_value=mock_supabase()):
            response = await client.get("/api/v1/evaluator/report/teacher", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "classrooms" in data
        assert len(data["classrooms"]) == 2

    @pytest.mark.asyncio
    async def test_teacher_analytics_student_accuracy(self, client: AsyncClient, auth_headers):
        """Student accuracy is correctly computed from interaction records."""
        with patch("app.api.v1.endpoints.evaluator.get_supabase_admin", return_value=mock_supabase()):
            response = await client.get("/api/v1/evaluator/report/teacher", headers=auth_headers)
        data = response.json()
        # stu-1: 2 correct out of 3 = 67%
        all_students = [s for c in data["classrooms"] for s in c["students"]]
        stu1 = next(s for s in all_students if s["student_id"] == "stu-1")
        assert stu1["total_interactions"] == 3
        assert stu1["mission_accuracy_pct"] == 67

    @pytest.mark.asyncio
    async def test_teacher_analytics_empty_classrooms(self, client: AsyncClient, auth_headers):
        """Returns empty classrooms list when teacher has no classrooms."""
        sb = MagicMock()
        sb.table("classrooms").select().eq().execute.return_value = MagicMock(data=[])
        sb.table("students").select().in_().execute.return_value = MagicMock(data=[])
        sb.table("student_interactions").select().in_().execute.return_value = MagicMock(data=[])
        with patch("app.api.v1.endpoints.evaluator.get_supabase_admin", return_value=sb):
            response = await client.get("/api/v1/evaluator/report/teacher", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["classrooms"] == []
