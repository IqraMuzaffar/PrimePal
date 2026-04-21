# backend/tests/test_student_update.py
"""Tests for PATCH /classroom/{id}/students/{student_id}"""
import pytest
from unittest.mock import MagicMock, patch


TEACHER = {"id": "teacher-uuid-123"}
CLASSROOM_ROW = {"id": "cls-1", "teacher_id": "teacher-uuid-123"}
STUDENT_ROW = {
    "id": "stu-1",
    "student_name": "Ali",
    "avatar_url": "https://example.com/avatar.svg",
    "secret_pin": "1234",
    "roll_number": None,
    "email": None,
}
UPDATED_STUDENT = {
    **STUDENT_ROW,
    "student_name": "Ali Khan",
    "roll_number": "R101",
    "email": "ali@school.edu",
}


def mock_supabase(classroom_data=None, student_data=None):
    sb = MagicMock()
    # classroom ownership check
    sb.table("classrooms").select().eq().maybe_single().execute.return_value = MagicMock(data=classroom_data or CLASSROOM_ROW)
    # student update
    sb.table("students").update().eq().eq().execute.return_value = MagicMock(data=[student_data or UPDATED_STUDENT])
    return sb


class TestUpdateStudent:
    """Update student endpoint tests — teacher auth is overridden for all tests in this class."""

    @pytest.fixture(autouse=True)
    def _override_teacher_auth(self):
        from app.core.security import get_current_teacher
        from app.main import app

        app.dependency_overrides[get_current_teacher] = lambda: TEACHER
        yield
        app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_update_student_success(self, client):
        """PATCH updates student name, roll_number, email and returns updated student."""
        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_supabase()):
            response = await client.patch(
                "/api/v1/classroom/cls-1/students/stu-1",
                json={"student_name": "Ali Khan", "roll_number": "R101", "email": "ali@school.edu"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["student_name"] == "Ali Khan"
        assert data["roll_number"] == "R101"
        assert data["email"] == "ali@school.edu"

    @pytest.mark.asyncio
    async def test_update_student_partial(self, client):
        """PATCH with only roll_number — other fields unchanged."""
        partial = {**STUDENT_ROW, "roll_number": "R202"}
        sb = mock_supabase(student_data=partial)
        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=sb):
            response = await client.patch(
                "/api/v1/classroom/cls-1/students/stu-1",
                json={"roll_number": "R202"},
            )
        assert response.status_code == 200
        assert response.json()["roll_number"] == "R202"

    @pytest.mark.asyncio
    async def test_update_student_wrong_classroom(self, client):
        """PATCH returns 403 when classroom belongs to different teacher."""
        sb = MagicMock()
        sb.table("classrooms").select().eq().maybe_single().execute.return_value = MagicMock(
            data={"id": "cls-1", "teacher_id": "other-teacher"}
        )
        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=sb):
            response = await client.patch(
                "/api/v1/classroom/cls-1/students/stu-1",
                json={"student_name": "X"},
            )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_update_student_no_fields(self, client):
        """PATCH with empty body returns 422."""
        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_supabase()):
            response = await client.patch(
                "/api/v1/classroom/cls-1/students/stu-1",
                json={},
            )
        assert response.status_code == 422
