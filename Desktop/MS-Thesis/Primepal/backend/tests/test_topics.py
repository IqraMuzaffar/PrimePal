"""Tests for topics and active-topics endpoints."""
import pytest
from unittest.mock import MagicMock


def make_topic_row(id: int, grade_level: int, topic_name: str) -> dict:
    return {"id": id, "grade_level": grade_level, "topic_name": topic_name}


def test_get_topics_returns_list_for_valid_grade():
    """GET /topics?grade_level=1 returns topic list for grade 1."""
    from app.api.v1.endpoints.topics import get_topics

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        make_topic_row(1, 1, "Phonics"),
        make_topic_row(2, 1, "Colors"),
    ]

    import asyncio
    result = asyncio.run(get_topics(grade_level=1, supabase=mock_supabase))

    assert len(result) == 2
    assert result[0]["topic_name"] == "Phonics"
    assert result[0]["grade_level"] == 1


def test_get_topics_invalid_grade_raises_400():
    """GET /topics?grade_level=9 raises HTTP 400 (grade 1-5 only)."""
    from app.api.v1.endpoints.topics import get_topics
    import asyncio
    from fastapi import HTTPException

    mock_supabase = MagicMock()
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_topics(grade_level=9, supabase=mock_supabase))
    assert exc_info.value.status_code == 400


def test_get_active_topics_returns_all_when_no_selection():
    """If classroom has no saved selections, return ALL topics for its grade."""
    from app.api.v1.endpoints.classroom import get_active_topics

    mock_supabase = MagicMock()

    # First call: classroom_active_topics returns empty (no saved selection)
    # Second call: snc_topics returns all grade-1 topics
    all_topics = [
        make_topic_row(1, 1, "Phonics"),
        make_topic_row(2, 1, "Colors"),
    ]

    # Mock chain: .table().select().eq().execute() → no saved ids
    no_saved = MagicMock()
    no_saved.data = []

    all_topics_resp = MagicMock()
    all_topics_resp.data = all_topics

    # We need two different table() calls to return different things
    table_mock = MagicMock()
    # First call (classroom_active_topics): .select().eq().execute() → empty
    first_chain = MagicMock()
    first_chain.execute.return_value = no_saved
    # Second call (snc_topics): .select().eq().order().execute() → all topics
    second_chain = MagicMock()
    second_chain.execute.return_value = all_topics_resp

    select_mock = MagicMock()
    select_mock.eq.return_value = first_chain

    select_mock2 = MagicMock()
    eq_mock2 = MagicMock()
    eq_mock2.order.return_value = second_chain
    select_mock2.eq.return_value = eq_mock2

    call_count = {"n": 0}

    def table_side_effect(name):
        t = MagicMock()
        if name == "classroom_active_topics":
            t.select.return_value = select_mock
        else:
            t.select.return_value = select_mock2
        return t

    mock_supabase.table.side_effect = table_side_effect

    import asyncio
    result = asyncio.run(get_active_topics(
        classroom_id="cls-uuid",
        grade_level=1,
        supabase=mock_supabase,
    ))
    assert len(result) == 2


def test_put_active_topics_replaces_selection():
    """PUT active-topics deletes old rows and inserts new ones."""
    from app.api.v1.endpoints.classroom import save_active_topics

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = []
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"classroom_id": "cls-uuid", "topic_id": 1},
        {"classroom_id": "cls-uuid", "topic_id": 3},
    ]

    import asyncio
    result = asyncio.run(save_active_topics(
        classroom_id="cls-uuid",
        topic_ids=[1, 3],
        supabase=mock_supabase,
    ))
    assert result["active_count"] == 2
