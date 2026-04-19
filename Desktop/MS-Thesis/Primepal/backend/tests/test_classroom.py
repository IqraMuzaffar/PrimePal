# backend/tests/test_classroom.py
"""
Tests for Feature 2: Classroom Manager

Covers:
  - POST /api/v1/classroom/         — create classroom
  - GET  /api/v1/classroom/         — list classrooms
  - GET  /api/v1/classroom/{id}     — get classroom detail with roster
  - POST /api/v1/classroom/{id}/students/bulk  — bulk add students
  - DELETE /api/v1/classroom/{id}/students/{sid} — remove student
"""
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient

# ── Constants ────────────────────────────────────────────────────────────────

TEACHER_ID  = "tttttttt-0000-0000-0000-000000000001"
CLASSROOM_ID = "cccccccc-0000-0000-0000-000000000001"
STUDENT_1_ID = "ssssssss-0000-0000-0000-000000000001"
STUDENT_2_ID = "ssssssss-0000-0000-0000-000000000002"

MOCK_TEACHER = {"id": TEACHER_ID}

MOCK_CLASSROOM_ROW = {
    "id": CLASSROOM_ID,
    "teacher_id": TEACHER_ID,
    "class_name": "Grade 3 — Blue",
    "class_code": "ABC123",
    "grade_level": 3,
    "created_at": "2026-04-01T10:00:00+00:00",
}

MOCK_STUDENTS = [
    {"id": STUDENT_1_ID, "student_name": "Ali", "avatar_url": "/avatars/tiger.png", "secret_pin": "1234"},
    {"id": STUDENT_2_ID, "student_name": "Sara", "avatar_url": "/avatars/owl.png", "secret_pin": "1234"},
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


def _make_admin_mock_simple(table_name: str, data):
    """Admin mock for single-table endpoints."""
    mock = MagicMock()
    result = MagicMock()
    result.data = data
    tbl = MagicMock()
    tbl.insert.return_value.execute.return_value = result
    tbl.select.return_value.eq.return_value.order.return_value.execute.return_value = result
    mock.table.return_value = tbl
    return mock


# ── POST /api/v1/classroom/ ───────────────────────────────────────────────────

class TestCreateClassroom:

    async def test_create_classroom_returns_201(self, client: AsyncClient):
        """Happy path: valid body → 201 + classroom with class_code."""
        mock_admin = MagicMock()
        result = MagicMock()
        result.data = [MOCK_CLASSROOM_ROW]
        mock_admin.table.return_value.insert.return_value.execute.return_value = result

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.post(
                "/api/v1/classroom/",
                json={"class_name": "Grade 3 — Blue", "grade_level": 3},
            )

        assert resp.status_code == 201
        body = resp.json()
        assert body["class_name"] == "Grade 3 — Blue"
        assert body["class_code"] == "ABC123"
        assert body["grade_level"] == 3

    async def test_create_classroom_requires_auth(self, client: AsyncClient):
        """No token → 403 (HTTPBearer raises 403 when credentials absent)."""
        from app.main import app
        from app.core.security import get_current_teacher
        # Remove the override for this test
        app.dependency_overrides.pop(get_current_teacher, None)

        resp = await client.post(
            "/api/v1/classroom/",
            json={"class_name": "Test", "grade_level": 1},
        )
        assert resp.status_code == 403

        # Restore for autouse teardown
        app.dependency_overrides[get_current_teacher] = lambda: MOCK_TEACHER


# ── GET /api/v1/classroom/ ────────────────────────────────────────────────────

class TestListClassrooms:

    async def test_list_classrooms_returns_owned(self, client: AsyncClient):
        """Teacher gets back their classrooms."""
        mock_admin = MagicMock()
        result = MagicMock()
        result.data = [MOCK_CLASSROOM_ROW]
        mock_admin.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = result

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.get("/api/v1/classroom/")

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["class_code"] == "ABC123"

    async def test_list_classrooms_empty(self, client: AsyncClient):
        """No classrooms → empty list, not an error."""
        mock_admin = MagicMock()
        result = MagicMock()
        result.data = []
        mock_admin.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = result

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.get("/api/v1/classroom/")

        assert resp.status_code == 200
        assert resp.json() == []


# ── GET /api/v1/classroom/{id} ────────────────────────────────────────────────

class TestGetClassroomDetail:

    def _make_detail_mock(self, classroom_data=MOCK_CLASSROOM_ROW, students=MOCK_STUDENTS):
        mock_admin = MagicMock()

        def _table(name):
            tbl = MagicMock()
            if name == "classrooms":
                r = MagicMock()
                r.data = classroom_data
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "students":
                r = MagicMock()
                r.data = students
                tbl.select.return_value.eq.return_value.execute.return_value = r
            return tbl

        mock_admin.table.side_effect = _table
        return mock_admin

    async def test_get_classroom_detail_with_students(self, client: AsyncClient):
        """Returns classroom + full student roster."""
        mock_admin = self._make_detail_mock()

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.get(f"/api/v1/classroom/{CLASSROOM_ID}")

        assert resp.status_code == 200
        body = resp.json()
        assert body["class_code"] == "ABC123"
        assert len(body["students"]) == 2
        assert body["students"][0]["student_name"] == "Ali"

    async def test_get_classroom_wrong_teacher_returns_403(self, client: AsyncClient):
        """Classroom owned by different teacher → 403."""
        other_teacher_row = {**MOCK_CLASSROOM_ROW, "teacher_id": "different-teacher-uuid"}
        mock_admin = self._make_detail_mock(classroom_data=other_teacher_row)

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.get(f"/api/v1/classroom/{CLASSROOM_ID}")

        assert resp.status_code == 403


# ── POST /api/v1/classroom/{id}/students/bulk ────────────────────────────────

class TestBulkAddStudents:

    def _make_bulk_mock(self):
        mock_admin = MagicMock()

        def _table(name):
            tbl = MagicMock()
            if name == "classrooms":
                r = MagicMock()
                r.data = {"teacher_id": TEACHER_ID}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "students":
                r = MagicMock()
                r.data = []
                tbl.insert.return_value.execute.return_value = r
            return tbl

        mock_admin.table.side_effect = _table
        return mock_admin

    async def test_bulk_add_students_success(self, client: AsyncClient):
        """3 names → {"added": 3}."""
        mock_admin = self._make_bulk_mock()

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.post(
                f"/api/v1/classroom/{CLASSROOM_ID}/students/bulk",
                json={"names": ["Ali", "Sara", "Umar"]},
            )

        assert resp.status_code == 200
        assert resp.json()["added"] == 3

    async def test_bulk_add_filters_empty_names(self, client: AsyncClient):
        """Empty strings and whitespace-only entries are stripped before counting."""
        mock_admin = self._make_bulk_mock()

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.post(
                f"/api/v1/classroom/{CLASSROOM_ID}/students/bulk",
                json={"names": ["Ali", "", "  ", "Sara"]},
            )

        assert resp.status_code == 200
        assert resp.json()["added"] == 2  # only "Ali" and "Sara" are valid


# ── DELETE /api/v1/classroom/{id}/students/{sid} ─────────────────────────────

class TestRemoveStudent:

    def _make_remove_mock(self, deleted_rows=None):
        """deleted_rows=[] simulates student not found; deleted_rows=[row] simulates success."""
        mock_admin = MagicMock()
        if deleted_rows is None:
            deleted_rows = [{"id": STUDENT_1_ID}]

        def _table(name):
            tbl = MagicMock()
            if name == "classrooms":
                r = MagicMock()
                r.data = {"teacher_id": TEACHER_ID}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "students":
                r = MagicMock()
                r.data = deleted_rows
                tbl.delete.return_value.eq.return_value.eq.return_value.execute.return_value = r
            return tbl

        mock_admin.table.side_effect = _table
        return mock_admin

    async def test_remove_student_success(self, client: AsyncClient):
        """Valid student_id + classroom_id → 204."""
        mock_admin = self._make_remove_mock()

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.delete(
                f"/api/v1/classroom/{CLASSROOM_ID}/students/{STUDENT_1_ID}"
            )

        assert resp.status_code == 204

    async def test_remove_student_not_found(self, client: AsyncClient):
        """Student not in this classroom → 404."""
        mock_admin = self._make_remove_mock(deleted_rows=[])

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.delete(
                f"/api/v1/classroom/{CLASSROOM_ID}/students/nonexistent-id"
            )

        assert resp.status_code == 404
