"""
Tests for Feature 1: Smart Auth & Role Management

Covers:
  - GET  /api/v1/auth/classroom/{class_code}/avatars
  - POST /api/v1/auth/student/login
  - JWT utility functions (create_student_token, decode_student_token)
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import jwt
import pytest
from httpx import AsyncClient

# ── Fixtures & helpers ────────────────────────────────────────────────────────

CLASSROOM_ID = "aaaaaaaa-0000-0000-0000-000000000001"
STUDENT_1_ID = "bbbbbbbb-0000-0000-0000-000000000001"
STUDENT_2_ID = "bbbbbbbb-0000-0000-0000-000000000002"
VALID_CLASS_CODE = "ABC123"

MOCK_CLASSROOM = {"id": CLASSROOM_ID}
MOCK_STUDENTS = [
    {"id": STUDENT_1_ID, "student_name": "Ali", "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=Ali"},
    {"id": STUDENT_2_ID, "student_name": "Sara", "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=Sara"},
]


def _make_supabase_mock(classroom=MOCK_CLASSROOM, students=MOCK_STUDENTS, student=MOCK_STUDENTS[0]):
    """
    Build a MagicMock that mimics the supabase-py chained query interface.
    Dispatches different return values based on which table is queried.
    """
    mock_client = MagicMock()

    def _table_side_effect(table_name: str):
        tbl = MagicMock()

        if table_name == "classrooms":
            result = MagicMock()
            result.data = classroom
            tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = result

        elif table_name == "students":
            # The avatars endpoint does .select().eq().execute()
            list_result = MagicMock()
            list_result.data = students
            tbl.select.return_value.eq.return_value.execute.return_value = list_result

            # The login endpoint does .select().eq().eq().maybe_single().execute()
            single_result = MagicMock()
            single_result.data = student
            tbl.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = single_result

        return tbl

    mock_client.table.side_effect = _table_side_effect
    return mock_client


# ── Tests: GET /api/v1/auth/classroom/{class_code}/avatars ────────────────────

class TestGetClassroomAvatars:

    async def test_returns_student_list_for_valid_code(self, client: AsyncClient):
        """Happy path: valid class code returns list of avatars."""
        mock_sb = _make_supabase_mock()
        with patch("app.api.v1.endpoints.auth.get_supabase", return_value=mock_sb):
            resp = await client.get(f"/api/v1/auth/classroom/{VALID_CLASS_CODE}/avatars")

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["student_name"] == "Ali"
        assert data[1]["student_name"] == "Sara"
        assert "id" in data[0]
        assert "avatar_url" in data[0]

    async def test_returns_404_for_unknown_class_code(self, client: AsyncClient):
        """Class code not in DB → 404."""
        mock_sb = _make_supabase_mock(classroom=None)
        with patch("app.api.v1.endpoints.auth.get_supabase", return_value=mock_sb):
            resp = await client.get("/api/v1/auth/classroom/BADCODE/avatars")

        assert resp.status_code == 404
        assert "class code" in resp.json()["detail"].lower()

    async def test_returns_empty_list_when_no_students(self, client: AsyncClient):
        """Valid class code but classroom has no students yet → empty list, not an error."""
        mock_sb = _make_supabase_mock(students=[])
        with patch("app.api.v1.endpoints.auth.get_supabase", return_value=mock_sb):
            resp = await client.get(f"/api/v1/auth/classroom/{VALID_CLASS_CODE}/avatars")

        assert resp.status_code == 200
        assert resp.json() == []

    async def test_class_code_is_case_insensitive_path(self, client: AsyncClient):
        """Whatever case the client sends, the endpoint passes it to Supabase as-is."""
        mock_sb = _make_supabase_mock()
        with patch("app.api.v1.endpoints.auth.get_supabase", return_value=mock_sb):
            resp = await client.get(f"/api/v1/auth/classroom/abc123/avatars")

        # As long as Supabase is called (mock handles it), we expect 200
        assert resp.status_code == 200


# ── Tests: POST /api/v1/auth/student/login ────────────────────────────────────

class TestStudentLogin:

    async def test_returns_jwt_for_valid_student(self, client: AsyncClient):
        """Happy path: valid student_id + class_code → JWT issued."""
        mock_sb = _make_supabase_mock()
        with patch("app.api.v1.endpoints.auth.get_supabase", return_value=mock_sb):
            resp = await client.post(
                "/api/v1/auth/student/login",
                json={"student_id": STUDENT_1_ID, "class_code": VALID_CLASS_CODE},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
        # Token should be a valid JWT string
        assert len(body["access_token"].split(".")) == 3

    async def test_token_contains_correct_claims(self, client: AsyncClient):
        """JWT payload should have sub=student_id, classroom_id, role=student."""
        from app.core.config import settings

        mock_sb = _make_supabase_mock()
        with patch("app.api.v1.endpoints.auth.get_supabase", return_value=mock_sb):
            resp = await client.post(
                "/api/v1/auth/student/login",
                json={"student_id": STUDENT_1_ID, "class_code": VALID_CLASS_CODE},
            )

        token = resp.json()["access_token"]
        payload = jwt.decode(token, settings.STUDENT_JWT_SECRET, algorithms=["HS256"])
        assert payload["sub"] == STUDENT_1_ID
        assert payload["classroom_id"] == CLASSROOM_ID
        assert payload["role"] == "student"

    async def test_returns_404_for_invalid_class_code(self, client: AsyncClient):
        """Bad class code → 404."""
        mock_sb = _make_supabase_mock(classroom=None)
        with patch("app.api.v1.endpoints.auth.get_supabase", return_value=mock_sb):
            resp = await client.post(
                "/api/v1/auth/student/login",
                json={"student_id": STUDENT_1_ID, "class_code": "XXXXX"},
            )

        assert resp.status_code == 404

    async def test_returns_403_when_student_not_in_classroom(self, client: AsyncClient):
        """Student ID from a different classroom → 403 (prevents cross-classroom spoofing)."""
        mock_sb = _make_supabase_mock(student=None)
        with patch("app.api.v1.endpoints.auth.get_supabase", return_value=mock_sb):
            resp = await client.post(
                "/api/v1/auth/student/login",
                json={"student_id": "foreign-student-id", "class_code": VALID_CLASS_CODE},
            )

        assert resp.status_code == 403

    async def test_returns_422_for_missing_fields(self, client: AsyncClient):
        """Missing required fields → FastAPI validation error 422."""
        resp = await client.post(
            "/api/v1/auth/student/login",
            json={"class_code": VALID_CLASS_CODE},  # student_id missing
        )
        assert resp.status_code == 422


# ── Tests: JWT utility functions ─────────────────────────────────────────────

class TestJWTUtils:

    def test_create_student_token_returns_valid_jwt(self):
        """create_student_token should produce a decodable HS256 JWT."""
        from app.core.config import settings
        from app.core.security import create_student_token

        token = create_student_token(STUDENT_1_ID, CLASSROOM_ID)
        payload = jwt.decode(token, settings.STUDENT_JWT_SECRET, algorithms=["HS256"])

        assert payload["sub"] == STUDENT_1_ID
        assert payload["classroom_id"] == CLASSROOM_ID
        assert payload["role"] == "student"

    def test_decode_student_token_valid(self):
        """decode_student_token should return payload for a good token."""
        from app.core.security import create_student_token, decode_student_token

        token = create_student_token(STUDENT_1_ID, CLASSROOM_ID)
        payload = decode_student_token(token)

        assert payload["sub"] == STUDENT_1_ID
        assert payload["role"] == "student"

    def test_decode_student_token_expired(self):
        """Expired tokens should raise 401."""
        from fastapi import HTTPException

        from app.core.config import settings
        from app.core.security import decode_student_token

        expired_payload = {
            "sub": STUDENT_1_ID,
            "classroom_id": CLASSROOM_ID,
            "role": "student",
            "exp": datetime.now(tz=timezone.utc) - timedelta(seconds=1),
        }
        token = jwt.encode(expired_payload, settings.STUDENT_JWT_SECRET, algorithm="HS256")

        with pytest.raises(HTTPException) as exc_info:
            decode_student_token(token)

        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()

    def test_decode_student_token_tampered(self):
        """A tampered / invalid token should raise 401."""
        from fastapi import HTTPException

        from app.core.security import decode_student_token

        with pytest.raises(HTTPException) as exc_info:
            decode_student_token("this.is.not.a.valid.jwt")

        assert exc_info.value.status_code == 401

    def test_decode_student_token_wrong_role(self):
        """A token with role != 'student' should raise 403."""
        from fastapi import HTTPException

        from app.core.config import settings
        from app.core.security import decode_student_token

        teacher_payload = {
            "sub": "teacher-uuid",
            "role": "teacher",
            "exp": datetime.now(tz=timezone.utc) + timedelta(hours=1),
        }
        token = jwt.encode(teacher_payload, settings.STUDENT_JWT_SECRET, algorithm="HS256")

        with pytest.raises(HTTPException) as exc_info:
            decode_student_token(token)

        assert exc_info.value.status_code == 403
