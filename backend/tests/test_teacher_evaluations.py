"""
Tests for Teacher Evaluations endpoints.

Covers:
  - POST /api/v1/teacher-evaluations/submit  (pre-test, post-test, validation errors)
  - GET  /api/v1/teacher-evaluations/         (list, with timepoint filter)
  - GET  /api/v1/teacher-evaluations/{id}     (single record, 404 for missing)
  - GET  /api/v1/teacher-evaluations/export   (CSV download)
"""
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient

# ── Constants ────────────────────────────────────────────────────────────────

TEACHER = {"id": "teacher-uuid-eval-001"}

BASE_URL = "/api/v1/teacher-evaluations"

PRE_TEST_PAYLOAD = {
    "teacher_name": "Ms. Fatima",
    "teacher_email": "fatima@school.pk",
    "gender": "female",
    "qualification": "M.Ed",
    "years_teaching": "5-10",
    "grades_taught": [3, 4],
    "snc_training": True,
    "ai_training": False,
    "timepoint": "pre",
    "group_type": "treatment",
    "avg_class_size": "30-40",
    "student_device_access": "shared_tablets",
    "internet_stability": "intermittent",
    "main_constraints": ["large_class", "limited_devices"],
    "skill_listening_speaking": 3,
    "skill_reading_writing": 2,
    "skill_vocabulary": 2,
    "skill_confidence": 1,
    "readiness_hesitation": 4,
    "readiness_fear": 3,
    "readiness_avoidance": 3,
    "readiness_urdu_support": 5,
    "visibility_identify_weaknesses": 2,
    "visibility_personalize": 2,
    "visibility_monitor_beyond": 1,
    "confidence_explain": 4,
    "confidence_design_activities": 3,
    "confidence_safe_environment": 4,
}

POST_TEST_PAYLOAD = {
    **PRE_TEST_PAYLOAD,
    "timepoint": "post",
    # Section 7: PrimePal Usefulness (post-only)
    "usefulness_improves_learning": 5,
    "usefulness_notice_weaknesses": 4,
    "usefulness_home_realistic": 3,
    # Section 8: PrimePal Impact (post-only)
    "impact_helped_students": 5,
    "impact_helped_identify_weaknesses": 4,
    "impact_would_recommend": 5,
    "impact_most_valuable": ["pronunciation_feedback", "gamification"],
    "impact_improvements": ["more_urdu_support"],
}

FAKE_EVAL_ROW = {
    "id": "eval-uuid-001",
    "teacher_name": "Ms. Fatima",
    "timepoint": "pre",
    "group_type": "treatment",
    "created_at": "2026-05-01T10:00:00Z",
    "submitted_by": TEACHER["id"],
    **{k: v for k, v in PRE_TEST_PAYLOAD.items() if k not in ("timepoint", "group_type", "teacher_name")},
}

FAKE_EVAL_SUMMARY = {
    "id": "eval-uuid-001",
    "teacher_name": "Ms. Fatima",
    "timepoint": "pre",
    "group_type": "treatment",
    "created_at": "2026-05-01T10:00:00Z",
}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _mock_supabase_for_insert(inserted_row_id="eval-uuid-001"):
    """Mock Supabase that captures insert calls and returns a fake row."""
    sb = MagicMock()

    def table_side_effect(table_name):
        table_mock = MagicMock()
        if table_name == "teacher_evaluations":
            insert_result = MagicMock()
            insert_result.data = [{"id": inserted_row_id, **PRE_TEST_PAYLOAD, "submitted_by": TEACHER["id"]}]
            table_mock.insert.return_value.execute.return_value = insert_result
        return table_mock

    sb.table.side_effect = table_side_effect
    return sb


def _mock_supabase_for_list(rows=None, filtered_rows=None):
    """Mock Supabase for list queries with optional filter chain."""
    sb = MagicMock()

    def table_side_effect(table_name):
        table_mock = MagicMock()
        if table_name == "teacher_evaluations":
            select_mock = MagicMock()
            order_mock = MagicMock()
            eq_mock = MagicMock()

            result = MagicMock()
            result.data = rows if rows is not None else [FAKE_EVAL_SUMMARY]

            filtered_result = MagicMock()
            filtered_result.data = filtered_rows if filtered_rows is not None else rows or [FAKE_EVAL_SUMMARY]

            # Chain: .select(...).order(...).execute() — no filter
            order_mock.execute.return_value = result
            # Chain: .select(...).order(...).eq(...).execute() — with filter
            order_mock.eq.return_value = eq_mock
            eq_mock.execute.return_value = filtered_result
            eq_mock.eq.return_value = eq_mock  # for double .eq() chains
            select_mock.order.return_value = order_mock
            table_mock.select.return_value = select_mock
        return table_mock

    sb.table.side_effect = table_side_effect
    return sb


def _mock_supabase_for_get_single(row=None):
    """Mock Supabase for single-record fetch (maybe_single)."""
    sb = MagicMock()

    def table_side_effect(table_name):
        table_mock = MagicMock()
        if table_name == "teacher_evaluations":
            result = MagicMock()
            result.data = row
            table_mock.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = result
        return table_mock

    sb.table.side_effect = table_side_effect
    return sb


def _mock_supabase_for_export(rows=None):
    """Mock Supabase for CSV export."""
    sb = MagicMock()

    def table_side_effect(table_name):
        table_mock = MagicMock()
        if table_name == "teacher_evaluations":
            result = MagicMock()
            result.data = rows
            table_mock.select.return_value.order.return_value.execute.return_value = result
        return table_mock

    sb.table.side_effect = table_side_effect
    return sb


# ── Test class ───────────────────────────────────────────────────────────────

class TestTeacherEvaluations:
    """Teacher evaluation endpoint tests."""

    @pytest.fixture(autouse=True)
    def _override_teacher_auth(self):
        from app.core.security import get_current_teacher
        from app.main import app

        app.dependency_overrides[get_current_teacher] = lambda: TEACHER
        yield
        app.dependency_overrides.clear()

    # ── POST /submit ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_submit_pre_test_evaluation(self, client: AsyncClient, auth_headers):
        """POST /submit with a full pre-test payload succeeds and returns an ID."""
        sb = _mock_supabase_for_insert("eval-new-001")
        with patch(
            "app.api.v1.endpoints.teacher_evaluations.get_supabase_admin",
            return_value=sb,
        ):
            resp = await client.post(
                f"{BASE_URL}/submit", json=PRE_TEST_PAYLOAD, headers=auth_headers
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "eval-new-001"
        assert data["message"] == "Evaluation submitted successfully"
        # Verify insert was called on the correct table
        sb.table.assert_called_with("teacher_evaluations")

    @pytest.mark.asyncio
    async def test_submit_post_test_evaluation(self, client: AsyncClient, auth_headers):
        """POST /submit with a post-test payload (sections 7-8) succeeds."""
        # Use a shared table mock so we can inspect insert args after the request
        captured_inserts = []
        sb = MagicMock()

        def table_side_effect(table_name):
            table_mock = MagicMock()
            if table_name == "teacher_evaluations":
                def capture_insert(row):
                    captured_inserts.append(row)
                    result = MagicMock()
                    result.data = [{"id": "eval-post-001", **row}]
                    execute_mock = MagicMock(return_value=result)
                    chain = MagicMock()
                    chain.execute = execute_mock
                    return chain
                table_mock.insert.side_effect = capture_insert
            return table_mock

        sb.table.side_effect = table_side_effect

        with patch(
            "app.api.v1.endpoints.teacher_evaluations.get_supabase_admin",
            return_value=sb,
        ):
            resp = await client.post(
                f"{BASE_URL}/submit", json=POST_TEST_PAYLOAD, headers=auth_headers
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "eval-post-001"

        # Verify the inserted row includes post-only fields
        assert len(captured_inserts) == 1
        inserted_data = captured_inserts[0]
        assert inserted_data["usefulness_improves_learning"] == 5
        assert inserted_data["impact_most_valuable"] == ["pronunciation_feedback", "gamification"]
        assert inserted_data["submitted_by"] == TEACHER["id"]

    @pytest.mark.asyncio
    async def test_submit_missing_required_field(self, client: AsyncClient, auth_headers):
        """POST /submit without teacher_name returns 422 validation error."""
        payload = {**PRE_TEST_PAYLOAD}
        del payload["teacher_name"]
        resp = await client.post(
            f"{BASE_URL}/submit", json=payload, headers=auth_headers
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_submit_missing_timepoint(self, client: AsyncClient, auth_headers):
        """POST /submit without timepoint returns 422 validation error."""
        payload = {**PRE_TEST_PAYLOAD}
        del payload["timepoint"]
        resp = await client.post(
            f"{BASE_URL}/submit", json=payload, headers=auth_headers
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_submit_invalid_timepoint(self, client: AsyncClient, auth_headers):
        """POST /submit with invalid timepoint returns 400."""
        payload = {**PRE_TEST_PAYLOAD, "timepoint": "midway"}
        sb = _mock_supabase_for_insert()
        with patch(
            "app.api.v1.endpoints.teacher_evaluations.get_supabase_admin",
            return_value=sb,
        ):
            resp = await client.post(
                f"{BASE_URL}/submit", json=payload, headers=auth_headers
            )
        assert resp.status_code == 400
        assert "timepoint" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_submit_invalid_group_type(self, client: AsyncClient, auth_headers):
        """POST /submit with invalid group_type returns 400."""
        payload = {**PRE_TEST_PAYLOAD, "group_type": "placebo"}
        sb = _mock_supabase_for_insert()
        with patch(
            "app.api.v1.endpoints.teacher_evaluations.get_supabase_admin",
            return_value=sb,
        ):
            resp = await client.post(
                f"{BASE_URL}/submit", json=payload, headers=auth_headers
            )
        assert resp.status_code == 400
        assert "group_type" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_submit_db_failure_returns_500(self, client: AsyncClient, auth_headers):
        """POST /submit returns 500 when Supabase insert returns no data."""
        sb = MagicMock()

        def table_side_effect(table_name):
            table_mock = MagicMock()
            result = MagicMock()
            result.data = []  # empty — simulates insert failure
            table_mock.insert.return_value.execute.return_value = result
            return table_mock

        sb.table.side_effect = table_side_effect
        with patch(
            "app.api.v1.endpoints.teacher_evaluations.get_supabase_admin",
            return_value=sb,
        ):
            resp = await client.post(
                f"{BASE_URL}/submit", json=PRE_TEST_PAYLOAD, headers=auth_headers
            )
        assert resp.status_code == 500

    # ── GET / (list) ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_list_evaluations(self, client: AsyncClient, auth_headers):
        """GET / returns a list of evaluation summaries."""
        rows = [FAKE_EVAL_SUMMARY, {**FAKE_EVAL_SUMMARY, "id": "eval-uuid-002", "timepoint": "post"}]
        sb = _mock_supabase_for_list(rows=rows)
        with patch(
            "app.api.v1.endpoints.teacher_evaluations.get_supabase_admin",
            return_value=sb,
        ):
            resp = await client.get(f"{BASE_URL}/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    @pytest.mark.asyncio
    async def test_list_evaluations_with_timepoint_filter(self, client: AsyncClient, auth_headers):
        """GET /?timepoint=pre filters results."""
        filtered = [FAKE_EVAL_SUMMARY]
        sb = _mock_supabase_for_list(rows=[FAKE_EVAL_SUMMARY], filtered_rows=filtered)
        with patch(
            "app.api.v1.endpoints.teacher_evaluations.get_supabase_admin",
            return_value=sb,
        ):
            resp = await client.get(
                f"{BASE_URL}/?timepoint=pre", headers=auth_headers
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["timepoint"] == "pre"

    # ── GET /{id} (single) ───────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_get_evaluation_by_id(self, client: AsyncClient, auth_headers):
        """GET /{id} returns the full evaluation record."""
        sb = _mock_supabase_for_get_single(row=FAKE_EVAL_ROW)
        with patch(
            "app.api.v1.endpoints.teacher_evaluations.get_supabase_admin",
            return_value=sb,
        ):
            resp = await client.get(
                f"{BASE_URL}/eval-uuid-001", headers=auth_headers
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "eval-uuid-001"
        assert data["teacher_name"] == "Ms. Fatima"

    @pytest.mark.asyncio
    async def test_get_evaluation_not_found(self, client: AsyncClient, auth_headers):
        """GET /{id} with non-existent ID returns 404."""
        sb = _mock_supabase_for_get_single(row=None)
        with patch(
            "app.api.v1.endpoints.teacher_evaluations.get_supabase_admin",
            return_value=sb,
        ):
            resp = await client.get(
                f"{BASE_URL}/nonexistent-id", headers=auth_headers
            )
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Evaluation not found"

    # ── GET /export (CSV) ────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_export_csv(self, client: AsyncClient, auth_headers):
        """GET /export returns a CSV with correct headers and content."""
        rows = [
            {"id": "e1", "teacher_name": "Ms. Fatima", "timepoint": "pre", "group_type": "treatment"},
            {"id": "e2", "teacher_name": "Mr. Ahmed", "timepoint": "post", "group_type": "control"},
        ]
        sb = _mock_supabase_for_export(rows=rows)
        with patch(
            "app.api.v1.endpoints.teacher_evaluations.get_supabase_admin",
            return_value=sb,
        ):
            resp = await client.get(f"{BASE_URL}/export", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/csv")
        assert "teacher_evaluations.csv" in resp.headers.get("content-disposition", "")
        body = resp.text
        lines = body.strip().split("\n")
        assert len(lines) == 3  # header + 2 data rows
        header = lines[0]
        assert "id" in header
        assert "teacher_name" in header
        assert "Ms. Fatima" in lines[1]

    @pytest.mark.asyncio
    async def test_export_csv_empty_returns_404(self, client: AsyncClient, auth_headers):
        """GET /export returns 404 when no evaluations exist."""
        sb = _mock_supabase_for_export(rows=[])
        with patch(
            "app.api.v1.endpoints.teacher_evaluations.get_supabase_admin",
            return_value=sb,
        ):
            resp = await client.get(f"{BASE_URL}/export", headers=auth_headers)
        assert resp.status_code == 404
