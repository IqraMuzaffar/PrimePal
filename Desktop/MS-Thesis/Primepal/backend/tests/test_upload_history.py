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
