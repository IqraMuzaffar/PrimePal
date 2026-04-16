# backend/tests/test_upload_history.py
import pytest
from unittest.mock import MagicMock


def test_upload_logs_to_snc_uploads():
    """After successful embed, an snc_uploads row must be inserted."""
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()

    from app.api.v1.endpoints.curriculum import _log_upload
    _log_upload(
        supabase=mock_supabase,
        teacher_id="teacher-uuid-123",
        book_title="SNC Grade 3 English",
        grade_level=3,
        filename="snc_g3_english.pdf",
        total_chunks=45,
        embedded_count=45,
    )

    mock_supabase.table.assert_called_with("snc_uploads")
    insert_call = mock_supabase.table.return_value.insert.call_args[0][0]
    assert insert_call["teacher_id"] == "teacher-uuid-123"
    assert insert_call["grade_level"] == 3
    assert insert_call["embedded_count"] == 45


from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch


def test_get_uploads_returns_teacher_history(monkeypatch):
    """GET /curriculum/uploads returns rows for the current teacher only."""
    fake_rows = [
        {
            "id": "uuid-1",
            "book_title": "SNC Grade 3 English",
            "grade_level": 3,
            "filename": "snc_g3.pdf",
            "total_chunks": 45,
            "embedded_count": 45,
            "created_at": "2026-04-10T10:00:00+00:00",
        }
    ]
    mock_supabase = MagicMock()
    (
        mock_supabase.table.return_value
        .select.return_value
        .eq.return_value
        .order.return_value
        .execute.return_value
        .data
    ) = fake_rows

    monkeypatch.setattr(
        "app.api.v1.endpoints.curriculum.get_supabase_admin",
        lambda: mock_supabase,
    )

    from app.main import app
    from app.core.security import get_current_teacher
    client = TestClient(app)

    app.dependency_overrides[get_current_teacher] = lambda: {"sub": "teacher-uuid-123"}
    try:
        response = client.get(
            "/api/v1/curriculum/uploads",
            headers={"Authorization": "Bearer fake-token"},
        )
    finally:
        app.dependency_overrides.pop(get_current_teacher, None)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["book_title"] == "SNC Grade 3 English"
